// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {GameErrors as E} from "./libraries/GameErrors.sol";
import {GameTypes as G} from "./libraries/GameTypes.sol";

/// @notice Every number of the Squeek Wars economy, in one owner-editable table.
/// @dev The other contracts read it live, so a change applies from the next action on; villages,
/// armies and counters stay where they are. Percentages are whole percent unless named Milli.
/// Resource and SEED amounts in setters are whole units unless the field says Unit (millionths).
contract GameConfig {
    uint256 public constant UNIT = 1_000_000;
    uint256 public constant MAX_TIERS = 8;
    uint256 public constant MAX_TROOPS = 1_000_000;
    uint256 public constant NFT_COUNT_PRECISION = 32;

    address public owner;
    uint256 public version; // +1 on every change, so readers can cache the table

    struct Economy {
        uint32 startResources; // each resource at founding
        uint32 startSeed;
        uint32 shieldHours; // beginner shield
        uint32 fieldRate; // per hour at level 1
        uint16 fieldRateGrowth; // ×1/100 per level
        uint16 fieldCostGrowth;
        uint32 fieldSeconds; // level-1 build time
        uint16 fieldTimeGrowth;
        uint8 fieldMaxLevel;
        uint8 thBuildCutPct; // build time −% per Town Hall level above 1
        uint8 plotsBase; // plots = base + Town Hall level, at most plotsMax
        uint8 plotsMax;
        uint8 cancelRefundPct;
        uint16 upkeepMilli; // Food per room per hour, in thousandths
        uint16 barracksTimePct; // training time × this % per Barracks level above 1
        uint16 marketBase; // 100 of a resource gives base + perLevel × (Market − 1)
        uint16 marketPerLevel;
        uint32 boostSeed;
        uint16 boostPct;
        uint32 boostHours;
        uint32 peaceSeed;
        uint32 peaceHours;
        uint32 peaceCooldownHours;
        uint32 bannerSeed;
        uint16 squeekBuildPct; // most build time a wallet's Squeeks can cut
        uint32 squeekWorkTarget; // a day's work that gives the full Squeek cut
        uint32 seedWorkDiv; // SEED per village = day's work ÷ this
        uint32 wheelWorkDiv; // wheel bonus = day's work ÷ this
        uint16 wheelPctPerLevel; // wheel bonus cap per Wheelhouse level
        uint32 xpWorkDiv; // champion XP per claimed day = work ÷ this …
        uint32 xpDailyCap; // … at most this
    }

    struct Storage {
        uint32 storeBase;
        uint32 storePer; // Storehouse level l adds storePer × storeGrowth^(l−1)
        uint16 storeGrowth;
        uint32 vaultBase;
        uint32 vaultPer;
        uint16 vaultGrowth;
        uint32 roomBase;
        uint32 roomPer; // Burrow level l adds roomPer × l × roomGrowth^(l−1)
        uint16 roomGrowth;
    }

    struct War {
        uint16 winRatioPct; // attack ≥ defense × this % wins outright
        uint16 lossPct; // each side loses min(1, enemy ÷ own × this %)
        uint16 scoutBonusPct;
        uint32 scoutHours;
        uint8 raidsPerDay; // per attacker and target
        uint8 weakGap; // targets this many Town Hall levels lower …
        uint16 weakLootPct; // … give this % of the loot and no points
        uint16 siegePerWall; // siege units per Walls level knocked down
        uint8 maxWallDamage;
        uint32 repairHours; // one Walls level back per this many hours
        uint16 thGuard; // flat defense per Town Hall level
        uint16 forgePct; // attack and defense % per Forge level
        uint16 wallsPct; // defense % per Walls level
        uint16 maxSupport; // clan support groups one village can host
        uint16 campDamagePct; // a lost raid removes this % of its attack from a camp's defense
    }

    struct Hero {
        uint16 mightBase;
        uint16 mightPerPoint;
        uint32 attackPerPointMilli; // bonus per point in millionths (5,000 = 0.5%)
        uint32 defensePerPointMilli;
        uint32 carryPerPointMilli;
        uint8 statCap; // points per bonus
        uint8 pointsPerLevel;
        uint8 maxLevel;
        uint32 xpPerLevel; // level = 1 + √(XP ÷ this)
        uint16 squeekPct; // a Squeek holder's XP and stats, % of normal
        uint16 killXpDiv; // XP = killed value ÷ this
    }

    struct Wild {
        uint16 defenseBase; // full defense = size × min(defenseCap, base + perDay × season day)
        uint16 defensePerDay;
        uint16 defenseCap;
        uint16 stockBase; // stock per hour = size × (base + perDay × season day)
        uint16 stockPerDay;
        uint16 stockHours; // stock cap in hours of output
        uint32 regrowHours;
        uint16[3] sizePct; // small, normal, large
        uint16 lossValueNum; // killed value = defense removed × num ÷ den
        uint16 lossValueDen;
    }

    struct Social {
        uint8 joinHall;
        uint8 foundHall;
        uint8 capPerHall;
        uint8 maxMembers;
    }

    struct Unit {
        bool enabled;
        uint8 tier; // research tier needed
        uint8 role; // 0 normal, 1 scout, 2 siege
        uint16 attack;
        uint16 defense;
        uint16 speed; // tiles per hour
        uint16 carry;
        uint16 room;
        uint32 seconds_; // training time at Barracks 1
        uint32[4] cost;
    }

    struct Building {
        bool enabled;
        uint8 maxLevel;
        uint8 thCap; // 0 none, 1 ≤ Town Hall, 2 ≤ 2 × Town Hall
        uint8 tier; // research tier needed to build
        uint8 effect; // GameTypes.FX_*, applied on top of the slot's built-in role
        uint32 effectPerLevel;
        uint16 costGrowth;
        uint16 seedGrowth;
        uint16 timeGrowth;
        uint32 seed;
        uint32 seconds_;
        uint32[4] cost;
    }

    struct Tier {
        uint64 costEachUnit; // per resource, millionths
        uint64 seedUnit;
        uint32 seconds_;
        uint8 academy;
        uint16 carryPct; // bonuses unlocked by this tier
        uint16 speedPct;
        uint8 medicinePct; // fallen units returned
    }

    Economy private econ_;
    Storage private storage_;
    War private war_;
    Hero private hero_;
    Wild private wild_;
    Social private social_;
    uint32[4][4] private fieldCost_; // [field type][resource]: forest, farm, quarry, mine
    Unit[16] private units_;
    Building[16] private buildings_;
    Tier[8] private tiers_;
    uint8 public tierCount;
    string[16] private unitNames_;
    string[16] private buildingNames_;

    event Changed(string what, uint256 index, uint256 version);
    event OwnershipTransferred(address indexed from, address indexed to);

    modifier onlyOwner() {
        if (msg.sender != owner) revert E.NotOwner();
        _;
    }

    constructor(address owner_) {
        if (owner_ == address(0)) revert E.InvalidConfig();
        owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
        econ_ = Economy(750, 1500, 168, 18, 140, 160, 1440, 140, 10, 3, 3, 12, 80, 500, 90, 25, 5, 500, 25, 24, 4000, 12, 72, 1000, 30, 11000, 10, 4320, 25, 100, 150);
        storage_ = Storage(1500, 1800, 122, 300, 500, 122, 30, 20, 112);
        war_ = War(200, 50, 10, 12, 3, 3, 50, 20, 2, 12, 40, 2, 4, 30, 50);
        hero_ = Hero(50, 25, 5000, 5000, 10000, 20, 4, 30, 100, 110, 20);
        wild_ = Wild(150, 40, 4000, 20, 2, 24, 24, [uint16(60), 100, 150], 204, 56);
        social_ = Social(1, 3, 3, 30);
        fieldCost_ = [[uint32(30), 50, 45, 40], [uint32(45), 20, 50, 45], [uint32(45), 45, 20, 50], [uint32(50), 45, 45, 10]];
        _unit(0, "Spearman", 0, 0, 40, 35, 6, 50, 1, 900, [uint32(50), 45, 45, 40]);
        _unit(1, "Forager", 1, 0, 20, 15, 8, 120, 1, 720, [uint32(55), 55, 30, 20]);
        _unit(2, "Shieldbearer", 2, 0, 15, 70, 5, 20, 1, 1080, [uint32(60), 45, 70, 45]);
        _unit(3, "Berserker", 2, 0, 75, 20, 6, 40, 1, 1200, [uint32(55), 55, 35, 100]);
        _unit(4, "Charger", 3, 0, 90, 50, 14, 80, 2, 2100, [uint32(120), 130, 90, 170]);
        _unit(5, "Catapult", 4, G.ROLE_SIEGE, 30, 10, 3, 0, 4, 4200, [uint32(320), 140, 300, 170]);
        _unit(6, "Scout", 2, G.ROLE_SCOUT, 0, 5, 16, 0, 1, 480, [uint32(30), 40, 20, 40]);
        _building(0, "Town Hall", 10, 0, 0, 175, 667, 150, 2700, 150, [uint32(180), 170, 180, 170]);
        _building(1, "Walls", 10, 1, 0, 162, 0, 0, 2160, 145, [uint32(80), 60, 220, 140]);
        _building(2, "Wheelhouse", 10, 1, 0, 168, 300, 150, 2160, 145, [uint32(100), 110, 90, 100]);
        _building(3, "Storehouse", 20, 2, 0, 128, 0, 0, 1620, 120, [uint32(110), 100, 100, 90]);
        _building(4, "Vault", 20, 2, 1, 128, 0, 0, 1620, 120, [uint32(70), 60, 80, 50]);
        _building(5, "Burrow", 10, 1, 0, 155, 0, 0, 1800, 145, [uint32(70), 110, 70, 50]);
        _building(6, "Barracks", 10, 1, 0, 162, 0, 0, 2160, 145, [uint32(150), 150, 130, 170]);
        _building(7, "Academy", 10, 1, 0, 162, 0, 0, 2160, 145, [uint32(160), 160, 170, 210]);
        _building(8, "Forge", 10, 1, 2, 162, 0, 0, 2160, 145, [uint32(130), 110, 140, 260]);
        _building(9, "Clan Hall", 10, 1, 2, 162, 0, 0, 2160, 145, [uint32(190), 200, 180, 130]);
        _building(10, "Market", 10, 1, 0, 162, 0, 0, 2160, 145, [uint32(150), 200, 150, 150]);
        tiers_[0] = Tier(150_000_000, 300_000_000, 7200, 1, 0, 0, 0);
        tiers_[1] = Tier(330_000_000, 600_000_000, 12960, 2, 0, 0, 0);
        tiers_[2] = Tier(726_000_000, 1_200_000_000, 23328, 4, 20, 0, 0);
        tiers_[3] = Tier(1_597_200_000, 2_400_000_000, 41990, 6, 0, 0, 10);
        tiers_[4] = Tier(3_513_840_000, 4_800_000_000, 75582, 8, 20, 20, 0);
        tierCount = 5;
        version = 1;
    }

    function _unit(uint8 i, string memory name, uint8 tier, uint8 role, uint16 a, uint16 d, uint16 s, uint16 c, uint16 r, uint32 secs, uint32[4] memory cost) private {
        units_[i] = Unit(true, tier, role, a, d, s, c, r, secs, cost);
        unitNames_[i] = name;
    }

    function _building(uint8 i, string memory name, uint8 maxLevel, uint8 thCap, uint8 tier, uint16 costGrowth, uint32 seed, uint16 seedGrowth, uint32 secs, uint16 timeGrowth, uint32[4] memory cost) private {
        buildings_[i] = Building(true, maxLevel, thCap, tier, G.FX_NONE, 0, costGrowth, seedGrowth, timeGrowth, seed, secs, cost);
        buildingNames_[i] = name;
    }

    // ------------------------------------------------------------------ owner

    function transferOwnership(address to) external onlyOwner {
        if (to == address(0)) revert E.InvalidConfig();
        emit OwnershipTransferred(owner, to);
        owner = to;
    }

    function _changed(string memory what, uint256 index) private {
        emit Changed(what, index, ++version);
    }

    function setEconomy(Economy calldata e) external onlyOwner {
        require(
            e.fieldRate > 0 && e.fieldMaxLevel > 0 && e.fieldMaxLevel <= 20 && e.plotsMax <= 16
                && e.cancelRefundPct <= 100 && e.barracksTimePct > 0 && e.barracksTimePct <= 100
                && e.thBuildCutPct <= 10 && e.squeekBuildPct <= 90 && e.squeekWorkTarget > 0 && e.seedWorkDiv > 0
                && e.wheelWorkDiv > 0 && e.xpWorkDiv > 0 && e.boostHours > 0 && e.peaceHours > 0,
            E.InvalidConfig()
        );
        econ_ = e;
        _changed("economy", 0);
    }

    function setStorage(Storage calldata s) external onlyOwner {
        require(s.storeBase > 0 && s.storeGrowth >= 100 && s.vaultGrowth >= 100 && s.roomGrowth >= 100, E.InvalidConfig());
        storage_ = s;
        _changed("storage", 0);
    }

    function setWar(War calldata w) external onlyOwner {
        require(
            w.winRatioPct >= 100 && w.lossPct > 0 && w.siegePerWall > 0 && w.repairHours > 0 && w.maxSupport <= 100
                && w.campDamagePct <= 100 && w.weakLootPct <= 100,
            E.InvalidConfig()
        );
        war_ = w;
        _changed("war", 0);
    }

    function setHero(Hero calldata h) external onlyOwner {
        require(h.maxLevel > 0 && h.maxLevel <= 100 && h.xpPerLevel > 0 && h.killXpDiv > 0 && h.squeekPct >= 100, E.InvalidConfig());
        hero_ = h;
        _changed("hero", 0);
    }

    function setWild(Wild calldata w) external onlyOwner {
        require(w.lossValueDen > 0 && w.regrowHours > 0, E.InvalidConfig());
        wild_ = w;
        _changed("wild", 0);
    }

    function setSocial(Social calldata s) external onlyOwner {
        require(s.joinHall > 0 && s.foundHall >= s.joinHall && s.maxMembers > 0, E.InvalidConfig());
        social_ = s;
        _changed("social", 0);
    }

    function setFieldCosts(uint32[4][4] calldata c) external onlyOwner {
        fieldCost_ = c;
        _changed("fieldCosts", 0);
    }

    function setUnit(uint8 kind, Unit calldata u, string calldata name) external onlyOwner {
        require(kind < G.UNITS && bytes(name).length <= 32, E.InvalidUnit());
        require(!u.enabled || (u.speed > 0 && u.speed <= 100 && u.room > 0 && u.tier <= MAX_TIERS && u.role <= 2), E.InvalidConfig());
        units_[kind] = u;
        unitNames_[kind] = name;
        _changed("unit", kind);
    }

    function setBuilding(uint8 kind, Building calldata b, string calldata name) external onlyOwner {
        require(kind < G.KINDS && bytes(name).length <= 32, E.InvalidBuilding());
        require(
            b.maxLevel > 0 && b.maxLevel <= 20 && b.thCap <= 2 && b.tier <= MAX_TIERS && b.effect <= G.FX_VAULT
                && b.costGrowth >= 100 && b.timeGrowth >= 100 && (b.seed == 0 || b.seedGrowth >= 100)
                && (kind != G.TH && kind != G.WALLS || b.enabled) && (kind != G.WHEEL || b.maxLevel <= 10)
                && (kind != G.TH || b.maxLevel <= 10),
            E.InvalidConfig()
        );
        buildings_[kind] = b;
        buildingNames_[kind] = name;
        _changed("building", kind);
    }

    function setTier(uint8 tier, Tier calldata t) external onlyOwner {
        require(tier >= 1 && tier <= MAX_TIERS, E.InvalidTier());
        tiers_[tier - 1] = t;
        _changed("tier", tier);
    }

    function setTierCount(uint8 count) external onlyOwner {
        require(count <= MAX_TIERS, E.InvalidTier());
        tierCount = count;
        _changed("tierCount", count);
    }

    // ------------------------------------------------------------------ reads (whole tables)

    function economy() external view returns (Economy memory) { return econ_; }
    function storageRules() external view returns (Storage memory) { return storage_; }
    function war() external view returns (War memory) { return war_; }
    function hero() external view returns (Hero memory) { return hero_; }
    function wild() external view returns (Wild memory) { return wild_; }
    function social() external view returns (Social memory) { return social_; }
    function fieldCosts() external view returns (uint32[4][4] memory) { return fieldCost_; }
    function unit(uint8 kind) external view returns (Unit memory, string memory) { return (units_[kind], unitNames_[kind]); }
    function building(uint8 kind) external view returns (Building memory, string memory) { return (buildings_[kind], buildingNames_[kind]); }
    function tier(uint8 t) external view returns (Tier memory) { return tiers_[t - 1]; }
    function allUnits() external view returns (Unit[16] memory u, string[16] memory names) { return (units_, unitNames_); }
    function allBuildings() external view returns (Building[16] memory b, string[16] memory names) { return (buildings_, buildingNames_); }
    function allTiers() external view returns (Tier[8] memory t, uint8 count) { return (tiers_, tierCount); }

    // ------------------------------------------------------------------ reads used by the game

    function grow(uint256 base, uint256 n, uint256 d, uint256 exponent) public pure returns (uint256) {
        require(exponent <= 20, E.ExponentOutOfBounds());
        for (uint256 i; i < exponent; ++i) {
            base = base * n / d;
        }
        return base;
    }

    function fieldQuote(uint8 field, uint8 level) external view returns (uint256[4] memory cost, uint256 seconds_) {
        Economy storage e = econ_;
        require(field < 8 && level > 0 && level <= e.fieldMaxLevel, E.InvalidField());
        for (uint256 i; i < 4; ++i) {
            cost[i] = grow(uint256(fieldCost_[field / 2][i]) * UNIT, e.fieldCostGrowth, 100, level - 1);
        }
        seconds_ = grow(uint256(e.fieldSeconds) * UNIT, e.fieldTimeGrowth, 100, level - 1) / UNIT;
    }

    function fieldRate(uint8 level) external view returns (uint256) {
        if (level == 0) return 0;
        return grow(uint256(econ_.fieldRate) * UNIT, econ_.fieldRateGrowth, 100, level - 1);
    }

    /// @notice A building slot's level cap, Town Hall cap rule (0 none, 1 ≤ TH, 2 ≤ 2 × TH), tier and switch.
    function buildingRule(uint8 kind) external view returns (uint8 maxLevel, uint8 thCap, uint8 tier_, bool enabled) {
        require(kind < G.KINDS, E.InvalidBuilding());
        Building storage b = buildings_[kind];
        return (b.maxLevel, b.thCap, b.tier, b.enabled);
    }

    function buildingQuote(uint8 kind, uint8 level) external view returns (uint256[4] memory cost, uint256 seed, uint256 seconds_) {
        require(kind < G.KINDS, E.InvalidBuilding());
        Building storage b = buildings_[kind];
        require(level > 0 && level <= b.maxLevel, E.InvalidBuilding());
        for (uint256 i; i < 4; ++i) {
            cost[i] = grow(uint256(b.cost[i]) * UNIT, b.costGrowth, 100, level - 1);
        }
        if (b.seed != 0) seed = grow(uint256(b.seed) * UNIT, b.seedGrowth, 100, level - 1);
        seconds_ = grow(uint256(b.seconds_) * UNIT, b.timeGrowth, 100, level - 1) / UNIT;
    }

    function researchQuote(uint8 t) external view returns (uint256[4] memory cost, uint256 seed, uint256 seconds_, uint8 academy) {
        require(t > 0 && t <= tierCount, E.InvalidTier());
        Tier storage x = tiers_[t - 1];
        for (uint256 i; i < 4; ++i) {
            cost[i] = x.costEachUnit;
        }
        return (cost, x.seedUnit, x.seconds_, x.academy);
    }

    /// @notice Carry and speed bonuses summed over tiers 1..t, and the best medicine among them.
    function tierBonus(uint8 t) external view returns (uint256 carryPct, uint256 speedPct, uint256 medicinePct) {
        for (uint256 i; i < t && i < MAX_TIERS; ++i) {
            Tier storage x = tiers_[i];
            carryPct += x.carryPct;
            speedPct += x.speedPct;
            if (x.medicinePct > medicinePct) medicinePct = x.medicinePct;
        }
        if (medicinePct > 100) medicinePct = 100;
    }

    /// @param kind 0 storage, 1 vault protection (both millionths), 2 troop room (whole)
    function capacity(uint8 kind, uint8 level) external view returns (uint256 total) {
        require(kind < 3, E.InvalidCapacity());
        Storage storage s = storage_;
        total = kind == 0 ? uint256(s.storeBase) * UNIT : kind == 1 ? uint256(s.vaultBase) * UNIT : s.roomBase;
        for (uint256 i = 1; i <= level; ++i) {
            total += kind == 2
                ? grow(uint256(s.roomPer) * i * UNIT, s.roomGrowth, 100, i - 1) / UNIT
                : grow(uint256(kind == 0 ? s.storePer : s.vaultPer) * UNIT, kind == 0 ? s.storeGrowth : s.vaultGrowth, 100, i - 1);
        }
    }

    /// @notice Build time after the Town Hall, the wallet's Squeeks and building effects.
    function buildDuration(uint256 base, uint8 townHall, uint256 nftCount, uint256 work, uint256 cutPct) external view returns (uint256) {
        require(townHall > 0, E.InvalidTownHall());
        Economy storage e = econ_;
        nftCount = G.min(nftCount, NFT_COUNT_PRECISION);
        uint256 workFactor = G.min(work, e.squeekWorkTarget) * UNIT / e.squeekWorkTarget;
        uint256 reduction = uint256(e.squeekBuildPct) * 10_000 * (UNIT - UNIT / (uint256(1) << nftCount)) / UNIT * workFactor / UNIT;
        uint256 th = G.min(90, uint256(e.thBuildCutPct) * (townHall - 1));
        uint256 cut = G.min(90, cutPct);
        return G.ceilDiv(base * (100 - th) * (UNIT - reduction) * (100 - cut), 10_000 * UNIT);
    }

    function unitTable() external view returns (G.UnitTable memory t) {
        for (uint256 i; i < G.UNITS; ++i) {
            Unit storage u = units_[i];
            t.attack[i] = u.attack;
            t.defense[i] = u.defense;
            t.speed[i] = u.speed;
            t.carry[i] = u.carry;
            t.room[i] = u.room;
            t.value[i] = uint256(u.cost[0]) + u.cost[1] + u.cost[2] + u.cost[3];
            t.role[i] = u.role;
        }
    }

    function unitQuote(uint8 kind, uint8 barracks, uint8 researched, uint32 count, uint256 fasterPct)
        external
        view
        returns (uint256[4] memory cost, uint256 duration, uint256 rooms)
    {
        require(kind < G.UNITS && barracks > 0 && count > 0 && count <= MAX_TROOPS, E.InvalidTraining());
        Unit storage u = units_[kind];
        require(u.enabled, E.UnitDisabled());
        require(researched >= u.tier, E.ResearchRequired());
        for (uint256 i; i < 4; ++i) {
            cost[i] = uint256(u.cost[i]) * UNIT * count;
        }
        rooms = uint256(u.room) * count;
        uint256 each = grow(uint256(u.seconds_) * UNIT, econ_.barracksTimePct, 100, G.min(20, barracks - 1));
        duration = G.ceilDiv(each * count * (100 - G.min(90, fasterPct)), 100 * UNIT);
    }

    /// @notice Building effects summed over a village's building levels.
    function mods(uint8[16] calldata levels) external view returns (G.Mods memory m) {
        for (uint256 i; i < G.KINDS; ++i) {
            uint256 l = levels[i];
            if (l == 0) continue;
            Building storage b = buildings_[i];
            uint8 fx = b.effect;
            if (fx == G.FX_NONE || !b.enabled) continue;
            uint256 v = uint256(b.effectPerLevel) * l;
            if (fx == G.FX_DEFENSE_PCT) m.defensePct += v;
            else if (fx == G.FX_ATTACK_PCT) m.attackPct += v;
            else if (fx == G.FX_OUTPUT_PCT) m.outputPct += v;
            else if (fx == G.FX_STORAGE) m.storageAdd += v * UNIT;
            else if (fx == G.FX_ROOM) m.room += v;
            else if (fx == G.FX_TRAIN_PCT) m.trainPct += v;
            else if (fx == G.FX_BUILD_PCT) m.buildPct += v;
            else if (fx == G.FX_CARRY_PCT) m.carryPct += v;
            else if (fx == G.FX_VAULT) m.vault += v * UNIT;
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ModuleCalls} from "./libraries/ModuleCalls.sol";

import {GameErrors as E} from "./libraries/GameErrors.sol";

import {GameTypes as G} from "./libraries/GameTypes.sol";
import {Guard} from "./libraries/Guard.sol";
import {GameConfig} from "./GameConfig.sol";
import {SeedLedger} from "./SeedLedger.sol";
import {Clans} from "./Clans.sol";
import {IVillages} from "./interfaces/IVillages.sol";

/// @notice Deterministic armies, asynchronous movement, champion and camp engine.
/// @dev State is scoped by the calling game. Only resolve/completeTraining accept an explicit game,
/// and those can only execute actions already authorized through that game's player entry point.
/// Unit stats, battle rules, champion and camp numbers come from GameConfig at the time of use.
contract Army is Guard {
    uint256 public constant UNIT = 1_000_000;
    uint256 public constant MAX_XP = 1_000_000_000_000;
    uint256 private constant N = 16;
    GameConfig public immutable config;
    SeedLedger public immutable ledger;
    Clans public immutable clans;
    uint256 public immutable seasonStartedAt;

    struct Champion {
        uint256 xp;
        uint8 might;
        uint8 attack;
        uint8 defense;
        uint8 carry;
        bool away;
    }

    struct Training {
        uint8 kind;
        uint32 count;
        uint64 readyAt;
    }

    struct Movement {
        address owner;
        address target;
        uint16 campId;
        uint8 mode; // 1 raid, 2 scout, 3 support outbound, 4 return, 5 stationed, 6 completed
        bool champion;
        uint64 arriveAt;
        uint64 travelTime;
        uint32[16] units;
        uint256[4] loot;
    }

    struct Report {
        uint64 resolvedAt;
        uint256 attack;
        uint256 defense;
        uint256 attackerLostValue;
        uint256 defenderLostValue;
        uint256[4] loot;
        bool decisive;
        bool cancelled;
    }

    struct Camp {
        bool initialized;
        uint64 regrowAt;
        uint64 lastStock;
        uint256 defense;
        uint256[4] stock;
    }

    struct World {
        uint256 nextMovement;
        mapping(address => uint32[16]) home;
        mapping(address => uint256) room;
        mapping(address => Training) training;
        mapping(address => Champion) champions;
        mapping(uint256 => Movement) movements;
        mapping(uint256 => Report) reports;
        mapping(address => uint256[]) support;
        mapping(address => mapping(address => uint256)) supporting;
        mapping(bytes32 => uint8) raids;
        mapping(address => mapping(address => uint64)) scoutedUntil;
        mapping(uint16 => Camp) camps;
    }

    struct Combat {
        uint256 attack;
        uint256 defense;
        uint256 attackerLost;
        uint256 defenderLost;
        bool decisive;
        bool weakTarget;
        G.Context attacking;
        G.Context defending;
        G.UnitTable t;
        GameConfig.War w;
    }
    mapping(address => World) private worlds;

    event TrainingOrdered(
        address indexed game, address indexed player, uint8 kind, uint256 count, uint256 readyAt
    );
    event TrainingCompleted(address indexed game, address indexed player, uint8 kind, uint256 count);
    event MovementSent(
        address indexed game,
        uint256 indexed id,
        address indexed owner,
        address target,
        uint16 campId,
        uint8 mode,
        uint256 arriveAt
    );
    event MovementResolved(address indexed game, uint256 indexed id, uint8 mode, uint256 nextArrival);
    event Battle(
        address indexed game,
        uint256 indexed id,
        uint256 attack,
        uint256 defense,
        uint256 attackerLost,
        uint256 defenderLost,
        bool decisive
    );
    event ChampionXP(address indexed game, address indexed player, uint256 added, uint256 total);
    event ChampionAllocated(
        address indexed game, address indexed player, uint8 might, uint8 attack, uint8 defense, uint8 carry
    );
    event Scouted(
        address indexed game, address indexed player, address indexed target, bool success, uint256 until
    );

    constructor(GameConfig config_, SeedLedger ledger_, Clans clans_) {
        require(
            address(config_) != address(0) && address(ledger_) != address(0) && address(clans_) != address(0),
            E.InvalidDependency()
        );
        config = config_;
        ledger = ledger_;
        clans = clans_;
        seasonStartedAt = block.timestamp;
    }

    function home(address game, address who) external view returns (uint32[16] memory) {
        return worlds[game].home[who];
    }

    function allocatedRoom(address game, address who) external view returns (uint256) {
        return worlds[game].room[who];
    }

    function training(address game, address who) external view returns (Training memory) {
        return worlds[game].training[who];
    }

    function champion(address game, address who) external view returns (Champion memory) {
        return worlds[game].champions[who];
    }

    function movement(address game, uint256 id) external view returns (Movement memory) {
        return worlds[game].movements[id];
    }

    function report(address game, uint256 id) external view returns (Report memory) {
        return worlds[game].reports[id];
    }

    function movementCount(address game) external view returns (uint256) {
        return worlds[game].nextMovement;
    }

    function supportMovements(address game, address target) external view returns (uint256[] memory) {
        return worlds[game].support[target];
    }

    function scoutedUntil(address game, address who, address target) external view returns (uint64) {
        return worlds[game].scoutedUntil[who][target];
    }

    function camp(address game, uint16 id) external view returns (Camp memory) {
        require(id < 200, E.InvalidCamp());
        return worlds[game].camps[id];
    }

    function championLevel(address game, address who) public view returns (uint256) {
        GameConfig.Hero memory h = config.hero();
        return G.min(h.maxLevel, 1 + G.sqrt(worlds[game].champions[who].xp / h.xpPerLevel));
    }

    function train(address who, uint8 kind, uint32 count) external nonReentrant {
        World storage w = worlds[msg.sender];
        G.Context memory c = _context(msg.sender, who);
        require(c.exists && w.training[who].readyAt == 0, E.TrainingBusyOrMissingVillage());
        (uint256[4] memory cost, uint256 duration, uint256 room) =
            config.unitQuote(kind, c.barracks, c.research, count, c.trainPct);
        require(w.room[who] + room <= c.room, E.InsufficientBurrowRoom());
        ModuleCalls.invoke(
            address(IVillages(msg.sender)), abi.encodeCall(IVillages(msg.sender).armySpend, (who, cost)), 0
        );
        w.room[who] += room;
        w.training[who] = Training(kind, count, uint64(block.timestamp + duration));
        emit TrainingOrdered(msg.sender, who, kind, count, block.timestamp + duration);
    }

    function completeTraining(address game, address who) external nonReentrant {
        World storage w = worlds[game];
        Training memory t = w.training[who];
        require(t.readyAt != 0 && block.timestamp >= t.readyAt, E.TrainingNotReady());
        delete w.training[who];
        w.home[who][t.kind] += t.count;
        emit TrainingCompleted(game, who, t.kind, t.count);
    }

    function creditXP(address who, uint256 amount) external nonReentrant {
        _xp(msg.sender, who, amount);
    }

    function _xp(address game, address who, uint256 amount) private {
        if (amount == 0) return;
        if (
            abi.decode(
                    ModuleCalls.read(address(ledger), abi.encodeCall(ledger.nftBalance, (who)), 32), (uint256)
                ) != 0
        ) amount = amount * config.hero().squeekPct / 100;
        Champion storage c = worlds[game].champions[who];
        c.xp = G.min(MAX_XP, c.xp + amount);
        emit ChampionXP(game, who, amount, c.xp);
    }

    function allocate(address who, uint8 might, uint8 attack, uint8 defense, uint8 carry) external {
        Champion storage c = worlds[msg.sender].champions[who];
        GameConfig.Hero memory h = config.hero();
        require(attack <= h.statCap && defense <= h.statCap && carry <= h.statCap, E.StatCap());
        require(
            might >= c.might && attack >= c.attack && defense >= c.defense && carry >= c.carry,
            E.PointsCannotBeReassigned()
        );
        require(
            uint256(might) + attack + defense + carry <= uint256(h.pointsPerLevel) * (championLevel(msg.sender, who) - 1),
            E.InsufficientChampionPoints()
        );
        c.might = might;
        c.attack = attack;
        c.defense = defense;
        c.carry = carry;
        emit ChampionAllocated(msg.sender, who, might, attack, defense, carry);
    }

    function championStats(address game, address who)
        public
        view
        returns (uint256 might, uint256 attackBonus, uint256 defenseBonus, uint256 carryBonus)
    {
        Champion storage c = worlds[game].champions[who];
        GameConfig.Hero memory h = config.hero();
        might = h.mightBase + uint256(c.might) * h.mightPerPoint;
        attackBonus = uint256(c.attack) * h.attackPerPointMilli;
        defenseBonus = uint256(c.defense) * h.defensePerPointMilli;
        carryBonus = uint256(c.carry) * h.carryPerPointMilli;
        if (
            abi.decode(
                    ModuleCalls.read(address(ledger), abi.encodeCall(ledger.nftBalance, (who)), 32), (uint256)
                ) != 0
        ) {
            might = might * h.squeekPct / 100;
            attackBonus = attackBonus * h.squeekPct / 100;
            defenseBonus = defenseBonus * h.squeekPct / 100;
            carryBonus = carryBonus * h.squeekPct / 100;
        }
    }

    function travelTime(uint16 from, uint16 to, uint256 speed) public pure returns (uint256) {
        require(from < 10000 && to < 10000 && speed > 0 && speed <= 100, E.InvalidTravel());
        uint256 dx = from % 100 > to % 100 ? from % 100 - to % 100 : to % 100 - from % 100;
        uint256 dy = from / 100 > to / 100 ? from / 100 - to / 100 : to / 100 - from / 100;
        uint256 squared = (dx * dx + dy * dy) * UNIT * UNIT;
        uint256 distance = G.sqrt(squared);
        if (distance * distance < squared) ++distance;
        return G.ceilDiv(G.min(type(uint64).max, distance == 0 ? UNIT : distance) * 3600, speed * UNIT);
    }

    /// @notice Camps sit at every 49th map slot from 48, spread over the whole map.
    function campTile(uint16 campId) public pure returns (uint16) {
        return G.tile(uint256(campId) * 49 + 48);
    }

    function _raidKey(address who, address target, uint16 campId, uint256 day, bool arrival)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(who, target, target == address(0) ? campId : 0, day, arrival));
    }

    function _today() private view returns (uint256) {
        return abi.decode(ModuleCalls.read(address(ledger), abi.encodeCall(ledger.currentDay, ()), 32), (uint256));
    }

    function send(
        address who,
        address target,
        uint16 campId,
        uint32[16] calldata units,
        bool withChampion,
        uint8 mode
    ) external nonReentrant returns (uint256 id) {
        require(mode >= 1 && mode <= 3 && who != target, E.InvalidMovement());
        World storage w = worlds[msg.sender];
        G.Context memory c = _context(msg.sender, who);
        require(c.exists, E.MissingVillage());
        uint16 destination;
        if (target == address(0)) {
            require(campId < 200 && mode == 1, E.InvalidCampMovement());
            destination = campTile(campId);
        } else {
            G.Context memory d = _context(msg.sender, target);
            require(d.exists, E.MissingTarget());
            destination = d.tile;
            bool allied = _sameClan(msg.sender, who, target);
            if (mode == 3) {
                require(allied && !withChampion && w.supporting[who][target] == 0, E.InvalidSupport());
            } else {
                require(!allied && block.timestamp >= d.shieldUntil, E.TargetProtected());
            }
        }
        if (mode == 1) {
            bytes32 key = _raidKey(who, target, campId, _today(), false);
            require(w.raids[key] < config.war().raidsPerDay, E.DailyRaidLimit());
            ++w.raids[key];
        }
        G.UnitTable memory t = config.unitTable();
        uint256 speed = type(uint256).max;
        uint256 count;
        for (uint8 i; i < N; ++i) {
            require(units[i] <= w.home[who][i], E.InsufficientTroops());
            if (mode == 2 && t.role[i] != G.ROLE_SCOUT) require(units[i] == 0, E.OnlyScoutsReconnoitre());
            if (units[i] != 0) {
                speed = G.min(speed, t.speed[i]);
                count += units[i];
            }
            w.home[who][i] -= units[i];
        }
        require(count > 0 && count <= config.MAX_TROOPS(), E.InvalidTroopCount());
        if (mode == 2) require(!withChampion, E.ScoutsTravelAlone());
        if (withChampion) {
            require(!w.champions[who].away, E.ChampionAway());
            w.champions[who].away = true;
        }
        uint256 duration = travelTime(c.tile, destination, speed);
        (, uint256 faster,) = config.tierBonus(c.research);
        if (faster != 0) duration = G.ceilDiv(duration * 100, 100 + faster);
        id = ++w.nextMovement;
        Movement storage m = w.movements[id];
        m.owner = who;
        m.target = target;
        m.campId = campId;
        m.mode = mode;
        m.champion = withChampion;
        m.arriveAt = uint64(block.timestamp + duration);
        m.travelTime = uint64(duration);
        m.units = units;
        if (mode == 3) w.supporting[who][target] = id;
        emit MovementSent(msg.sender, id, who, target, campId, mode, block.timestamp + duration);
    }

    function resolve(address game, uint256 id) external nonReentrant {
        World storage w = worlds[game];
        Movement storage m = w.movements[id];
        require(m.mode >= 1 && m.mode <= 4 && block.timestamp >= m.arriveAt, E.MovementNotArrived());
        if (m.mode == 4) {
            ModuleCalls.invoke(
                address(IVillages(game)), abi.encodeCall(IVillages(game).armyCredit, (m.owner, m.loot)), 0
            );
            for (uint8 i; i < N; ++i) {
                w.home[m.owner][i] += m.units[i];
            }
            if (m.champion) w.champions[m.owner].away = false;
            delete m.loot;
            delete m.units;
            m.mode = 6;
        } else if (m.mode == 3) {
            if (_sameClan(game, m.owner, m.target) && w.support[m.target].length < config.war().maxSupport) {
                m.mode = 5;
                w.support[m.target].push(id);
            } else {
                w.supporting[m.owner][m.target] = 0;
                _return(m);
            }
        } else {
            bool protected_;
            if (m.target != address(0)) {
                G.Context memory d = _context(game, m.target);
                protected_ = block.timestamp < d.shieldUntil || _sameClan(game, m.owner, m.target);
            }
            if (m.mode == 1) {
                bytes32 key = _raidKey(m.owner, m.target, m.campId, _today(), true);
                if (w.raids[key] >= config.war().raidsPerDay) protected_ = true;
                if (!protected_) ++w.raids[key];
            }
            if (protected_) {
                w.reports[id].cancelled = true;
                w.reports[id].resolvedAt = uint64(block.timestamp);
            } else if (m.mode == 2) {
                _scout(game, m);
            } else {
                _battle(game, id);
            }
            _return(m);
        }
        emit MovementResolved(game, id, m.mode, m.arriveAt);
    }

    function _return(Movement storage m) private {
        m.mode = 4;
        m.arriveAt = uint64(block.timestamp + m.travelTime);
    }

    function recall(address who, uint256 id) external nonReentrant {
        World storage w = worlds[msg.sender];
        Movement storage m = w.movements[id];
        require(m.mode == 5 && (who == m.owner || who == m.target), E.CannotRecallSupport());
        _recall(w, m, msg.sender, id);
    }

    /// @notice Anyone can return support whose owners have ceased to be clanmates.
    function returnFormerSupport(address game, uint256 id) external nonReentrant {
        World storage w = worlds[game];
        Movement storage m = w.movements[id];
        require(m.mode == 5 && !_sameClan(game, m.owner, m.target), E.SupportStillAllied());
        _recall(w, m, game, id);
    }

    function _recall(World storage w, Movement storage m, address game, uint256 id) private {
        _removeSupport(w, m.target, id);
        w.supporting[m.owner][m.target] = 0;
        _return(m);
        emit MovementResolved(game, id, m.mode, m.arriveAt);
    }

    function _removeSupport(World storage w, address target, uint256 id) private {
        uint256[] storage list = w.support[target];
        for (uint256 i; i < list.length; ++i) {
            if (list[i] == id) {
                list[i] = list[list.length - 1];
                list.pop();
                return;
            }
        }
        revert E.MissingSupport();
    }

    function _scout(address game, Movement storage m) private {
        World storage w = worlds[game];
        ModuleCalls.invoke(address(IVillages(game)), abi.encodeCall(IVillages(game).armyTouch, (m.owner)), 0);
        G.UnitTable memory t = config.unitTable();
        uint256 enemy;
        for (uint8 i; i < N; ++i) {
            if (t.role[i] == G.ROLE_SCOUT) enemy += w.home[m.target][i];
        }
        uint256 left;
        uint256 lostRoom;
        for (uint8 i; i < N && enemy != 0; ++i) {
            uint256 lost = G.min(m.units[i], enemy);
            if (lost == 0) continue;
            m.units[i] -= uint32(lost);
            enemy -= lost;
            lostRoom += lost * t.room[i];
        }
        w.room[m.owner] -= lostRoom;
        for (uint8 i; i < N; ++i) {
            left += m.units[i];
        }
        bool success = left != 0;
        if (success) w.scoutedUntil[m.owner][m.target] = uint64(block.timestamp + uint256(config.war().scoutHours) * 1 hours);
        emit Scouted(game, m.owner, m.target, success, w.scoutedUntil[m.owner][m.target]);
    }

    function _strength(uint32[16] memory units, G.UnitTable memory t, bool attacking) private pure returns (uint256 total) {
        for (uint8 i; i < N; ++i) {
            total += units[i] * (attacking ? t.attack[i] : t.defense[i]);
        }
    }

    function _attack(address game, Movement storage m, Combat memory c) private view returns (uint256 power) {
        power = _strength(m.units, c.t, true) * (100 + uint256(c.attacking.forge) * c.w.forgePct + c.attacking.attackPct) / 100;
        if (m.champion) {
            (uint256 might, uint256 bonus,,) = championStats(game, m.owner);
            power = power * (UNIT + bonus) / UNIT + might;
        }
        if (m.target != address(0) && worlds[game].scoutedUntil[m.owner][m.target] > block.timestamp) {
            power = power * (100 + c.w.scoutBonusPct) / 100;
        }
    }

    function _defense(address game, address who, Combat memory c) private view returns (uint256 power) {
        World storage w = worlds[game];
        power = _strength(w.home[who], c.t, false) * (100 + uint256(c.defending.forge) * c.w.forgePct) / 100;
        uint256[] storage list = w.support[who];
        for (uint256 i; i < list.length; ++i) {
            Movement storage s = w.movements[list[i]];
            if (_sameClan(game, s.owner, who)) {
                G.Context memory ally = _context(game, s.owner);
                power += _strength(s.units, c.t, false) * (100 + uint256(ally.forge) * c.w.forgePct) / 100;
            }
        }
        if (!w.champions[who].away) {
            (uint256 might,, uint256 bonus,) = championStats(game, who);
            power = (power + might) * (UNIT + bonus) / UNIT;
        }
        power = power * (100 + uint256(c.defending.walls) * c.w.wallsPct + c.defending.defensePct) / 100
            + uint256(c.defending.townHall) * c.w.thGuard;
    }

    function _losses(
        address game,
        address who,
        uint32[16] storage units,
        uint256 enemy,
        uint256 own,
        bool wipe,
        uint256 medicinePct,
        Combat memory c
    ) private returns (uint256 killed) {
        ModuleCalls.invoke(address(IVillages(game)), abi.encodeCall(IVillages(game).armyTouch, (who)), 0);
        uint256 lostRoom;
        uint256[16] memory losses = wipe || own == 0 ? _all(units) : _casualties(units, enemy, own, c.w.lossPct);
        for (uint8 i; i < N; ++i) {
            uint256 lost = losses[i];
            if (medicinePct != 0 && !wipe) lost -= lost * medicinePct / 100;
            if (lost != 0) {
                units[i] -= uint32(lost);
                killed += lost * c.t.value[i];
                lostRoom += lost * c.t.room[i];
            }
        }
        worlds[game].room[who] -= lostRoom;
    }

    function _all(uint32[16] memory units) private pure returns (uint256[16] memory losses) {
        for (uint8 i; i < N; ++i) {
            losses[i] = units[i];
        }
    }

    /// @dev Rounds the army's casualties up once, not per stack: each stack loses its floored share of
    /// min(1, enemy × lossPct / (100 × own)) and the aggregate remainder goes, one unit each, to the
    /// stacks with the largest fractional parts.
    function _casualties(uint32[16] memory units, uint256 enemy, uint256 own, uint256 lossPct)
        private
        pure
        returns (uint256[16] memory losses)
    {
        uint256 denominator = own * 100;
        enemy *= lossPct;
        uint256[16] memory remainder;
        uint256 total;
        uint256 floored;
        for (uint8 i; i < N; ++i) {
            uint256 share = uint256(units[i]) * enemy;
            if (share >= uint256(units[i]) * denominator) {
                losses[i] = units[i];
            } else {
                losses[i] = share / denominator;
                remainder[i] = share % denominator;
            }
            total += units[i];
            floored += losses[i];
        }
        uint256 extra = G.min(total, G.ceilDiv(total * enemy, denominator)) - floored;
        for (; extra != 0; --extra) {
            uint8 best = uint8(N);
            for (uint8 i; i < N; ++i) {
                if (remainder[i] != 0 && (best == N || remainder[i] > remainder[best])) best = i;
            }
            if (best == N) break;
            ++losses[best];
            remainder[best] = 0;
        }
    }

    function _carry(address game, Movement storage m, Combat memory c) private view returns (uint256 capacity) {
        for (uint8 i; i < N; ++i) {
            capacity += m.units[i] * c.t.carry[i];
        }
        (uint256 tierCarry,,) = config.tierBonus(c.attacking.research);
        uint256 bonus = (tierCarry + c.attacking.carryPct) * UNIT / 100;
        if (m.champion) {
            (,,, uint256 championCarry) = championStats(game, m.owner);
            bonus += championCarry;
        }
        return capacity * UNIT * (UNIT + bonus) / UNIT;
    }

    function _battle(address game, uint256 id) private {
        World storage w = worlds[game];
        Movement storage m = w.movements[id];
        Combat memory c;
        c.t = config.unitTable();
        c.w = config.war();
        c.attacking = _context(game, m.owner);
        c.attack = _attack(game, m, c);
        if (m.target == address(0)) {
            _refreshCamp(w.camps[m.campId], m.campId);
            c.defense = w.camps[m.campId].defense;
        } else {
            c.defending = _context(game, m.target);
            c.defense = _defense(game, m.target, c);
            c.weakTarget = uint256(c.defending.townHall) + c.w.weakGap <= c.attacking.townHall;
        }
        c.decisive = c.attack != 0 && c.attack * 100 >= c.defense * c.w.winRatioPct;
        (,, uint256 medicine) = config.tierBonus(c.attacking.research);
        c.attackerLost = _losses(game, m.owner, m.units, c.defense, c.attack, false, medicine, c);
        if (m.target == address(0)) {
            _campBattle(game, m, c);
        } else {
            (,, medicine) = config.tierBonus(c.defending.research);
            c.defenderLost = _losses(game, m.target, w.home[m.target], c.attack, c.defense, c.decisive, medicine, c);
            uint256[] storage list = w.support[m.target];
            for (uint256 i; i < list.length; ++i) {
                Movement storage s = w.movements[list[i]];
                if (_sameClan(game, s.owner, m.target)) {
                    G.Context memory ally = _context(game, s.owner);
                    (,, medicine) = config.tierBonus(ally.research);
                    c.defenderLost += _losses(game, s.owner, s.units, c.attack, c.defense, c.decisive, medicine, c);
                }
            }
            // Losses above use the original defense and order for every contingent. Only afterwards
            // release emptied slots/pairs; walk backwards so swap-and-pop cannot skip an entry.
            for (uint256 i = list.length; i != 0; --i) {
                uint256 supportId = list[i - 1];
                Movement storage s = w.movements[supportId];
                uint32 remaining;
                for (uint8 j; j < N; ++j) {
                    remaining |= s.units[j];
                }
                if (remaining == 0) {
                    _recall(w, s, game, supportId);
                }
            }
            if (c.decisive) _loot(game, m, c);
            if (!c.weakTarget) {
                ModuleCalls.invoke(
                    address(IVillages(game)),
                    abi.encodeCall(IVillages(game).armyRecord, (m.target, 3, c.attackerLost)),
                    0
                );
                _xp(game, m.target, c.attackerLost / config.hero().killXpDiv);
            }
        }
        if (!c.weakTarget) {
            ModuleCalls.invoke(
                address(IVillages(game)),
                abi.encodeCall(IVillages(game).armyRecord, (m.owner, 2, c.defenderLost)),
                0
            );
            _xp(game, m.owner, c.defenderLost / config.hero().killXpDiv);
        }
        uint256 totalLoot = m.loot[0] + m.loot[1] + m.loot[2] + m.loot[3];
        if (totalLoot != 0) {
            ModuleCalls.invoke(
                address(IVillages(game)),
                abi.encodeCall(IVillages(game).armyRecord, (m.owner, 4, totalLoot)),
                0
            );
        }
        Report storage result = w.reports[id];
        result.resolvedAt = uint64(block.timestamp);
        result.attack = c.attack;
        result.defense = c.defense;
        result.attackerLostValue = c.attackerLost;
        result.defenderLostValue = c.defenderLost;
        result.loot = m.loot;
        result.decisive = c.decisive;
        result.cancelled = false;
        emit Battle(game, id, c.attack, c.defense, c.attackerLost, c.defenderLost, c.decisive);
    }

    function _campBattle(address game, Movement storage m, Combat memory c) private {
        Camp storage camp_ = worlds[game].camps[m.campId];
        GameConfig.Wild memory wl = config.wild();
        uint256 damage = c.decisive ? camp_.defense : G.min(camp_.defense, c.attack * c.w.campDamagePct / 100);
        camp_.defense -= damage;
        // Repeated raids on an empty camp must not postpone its existing regrowth.
        if (damage != 0 && camp_.regrowAt == 0) camp_.regrowAt = uint64(block.timestamp + uint256(wl.regrowHours) * 1 hours);
        c.defenderLost = damage * wl.lossValueNum / wl.lossValueDen;
        if (c.decisive) {
            uint256 carry = _carry(game, m, c) / 4;
            for (uint8 i; i < 4; ++i) {
                m.loot[i] = G.min(carry, camp_.stock[i]);
                camp_.stock[i] -= m.loot[i];
            }
        }
    }

    function _loot(address game, Movement storage m, Combat memory c) private {
        uint256 carry = _carry(game, m, c);
        if (c.weakTarget) carry = carry * c.w.weakLootPct / 100;
        m.loot = abi.decode(
            ModuleCalls.invoke(
                address(IVillages(game)), abi.encodeCall(IVillages(game).armyLoot, (m.target, carry)), 128
            ),
            (uint256[4])
        );
        uint256 siege;
        for (uint8 i; i < N; ++i) {
            if (c.t.role[i] == G.ROLE_SIEGE) siege += m.units[i];
        }
        uint256 damage = G.min(c.w.maxWallDamage, siege / c.w.siegePerWall);
        if (damage != 0) {
            ModuleCalls.invoke(
                address(IVillages(game)),
                abi.encodeCall(IVillages(game).armyDamageWalls, (m.target, uint8(damage))),
                0
            );
        }
    }

    function _seasonEpochDay() private view returns (uint256) {
        return abi.decode(
            ModuleCalls.read(address(ledger), abi.encodeCall(ledger.dayAt, (seasonStartedAt)), 32), (uint256)
        );
    }

    function campParameters(uint16 id) public view returns (uint256 defense, uint256 hourlyStock) {
        require(id < 200, E.InvalidCamp());
        GameConfig.Wild memory wl = config.wild();
        uint256 size = wl.sizePct[id % 3];
        uint256 day = _today() - _seasonEpochDay();
        defense = G.min(wl.defenseCap, uint256(wl.defenseBase) + uint256(wl.defensePerDay) * day) * size / 100;
        hourlyStock = (uint256(wl.stockBase) + uint256(wl.stockPerDay) * day) * UNIT * size / 100;
    }

    /// @dev Integral of the daily stepwise camp rate, anchored to the 04:00 UTC season day.
    function _campIntegral(GameConfig.Wild memory wl, uint16 id, uint256 timestamp) private view returns (uint256) {
        uint256 epoch = _seasonEpochDay() * 1 days + 4 hours;
        uint256 elapsed = timestamp >= epoch ? timestamp - epoch : 0;
        uint256 d = elapsed / 1 days;
        // Σ over whole days k < d of (base + perDay × k), then the running day's share
        uint256 weightedSeconds = (uint256(wl.stockBase) * d + uint256(wl.stockPerDay) * d * (d == 0 ? 0 : d - 1) / 2) * 1 days
            + (uint256(wl.stockBase) + uint256(wl.stockPerDay) * d) * (elapsed % 1 days);
        return weightedSeconds * UNIT * wl.sizePct[id % 3] / 100 / 3600;
    }

    function _refreshCamp(Camp storage c, uint16 id) private {
        (uint256 defense, uint256 rate) = campParameters(id);
        GameConfig.Wild memory wl = config.wild();
        if (!c.initialized) {
            c.initialized = true;
            c.lastStock = uint64(seasonStartedAt);
            c.defense = defense;
        }
        if (block.timestamp >= c.regrowAt) {
            c.defense = defense;
            c.regrowAt = 0;
        }
        uint256 now_ = _campIntegral(wl, id, block.timestamp);
        uint256 then_ = _campIntegral(wl, id, c.lastStock);
        uint256 produced = now_ > then_ ? now_ - then_ : 0;
        for (uint8 i; i < 4; ++i) {
            c.stock[i] = G.min(rate * wl.stockHours, c.stock[i] + produced);
        }
        c.lastStock = uint64(block.timestamp);
    }

    function _context(address game, address who) private view returns (G.Context memory) {
        return abi.decode(
            ModuleCalls.read(game, abi.encodeCall(IVillages(game).armyContext, (who)), 416), (G.Context)
        );
    }

    function _sameClan(address game, address a, address b) private view returns (bool) {
        return abi.decode(
            ModuleCalls.read(address(clans), abi.encodeCall(clans.sameClan, (game, a, b)), 32), (bool)
        );
    }
}

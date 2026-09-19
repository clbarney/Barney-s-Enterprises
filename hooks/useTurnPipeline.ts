import { useState, useCallback } from 'react';
import {
  Player,
  Property,
  BoardSpace,
  GameEventLog,
  GameRulesOptions,
} from '@/types/monopoly';
import { calculateRent, calculateTaxBill } from '@/lib/gameEngine';
import { soundFx } from '@/lib/sound';

interface EngineStateLike {
  gameState: any;
  players: Player[];
  properties: Property[];
  boardSpaces: BoardSpace[];
  logs: GameEventLog[];
  draftPool: Property[];
}

interface UseTurnPipelineProps<T extends EngineStateLike> {
  engineState: T;
  setEngineState: React.Dispatch<React.SetStateAction<T>>;
  rules: GameRulesOptions;
  activePlayer: Player;
  addLog: (message: string, type?: GameEventLog['type'], playerId?: number) => void;
  onDrawChance: () => void;
  onDrawCommunityChest: () => void;
}

export function useTurnPipeline<T extends EngineStateLike>({
  engineState,
  setEngineState,
  rules,
  activePlayer,
  addLog,
  onDrawChance,
  onDrawCommunityChest,
}: UseTurnPipelineProps<T>) {
  const { gameState, players, properties, boardSpaces } = engineState;

  // Turn state & trigger flags
  const [rollTrigger, setRollTrigger] = useState(0);
  const [railwayTransitModalOpen, setRailwayTransitModalOpen] = useState(false);
  const [landOnGoModalOpen, setLandOnGoModalOpen] = useState(false);
  const [freeParkingModalOpen, setFreeParkingModalOpen] = useState(false);
  const [isTaxBreakdownOpen, setIsTaxBreakdownOpen] = useState(false);

  // --- FREE PARKING EXPANSION LANDING ENGINE ---
  const handleFreeParkingLanding = useCallback(
    (isDoubles: boolean) => {
      soundFx.playCash();
      const diceTotal = (gameState.lastDiceRoll?.[0] || 3) + (gameState.lastDiceRoll?.[1] || 4);

      if (isDoubles) {
        const nextDoubles = (activePlayer.freeParkingDoublesCount || 0) + 1;
        if (nextDoubles === 1) {
          const wonAmount = gameState.lotteryPool;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? { ...p, cash: p.cash + wonAmount, freeParkingDoublesCount: 1 }
                : p
            ),
            gameState: { ...prev.gameState, lotteryPool: 0 },
          }));
          addLog(
            `🎉 FREE PARKING DOUBLES! ${activePlayer.name} won the $${wonAmount} central lottery pool!`,
            'success',
            activePlayer.id
          );
        } else if (nextDoubles === 2) {
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? { ...p, goldenDealActive: true, freeParkingDoublesCount: 2 }
                : p
            ),
          }));
          addLog(
            `🌟 GOLDEN DEAL ACTIVATED! ${activePlayer.name} rolled a 2nd doubles on Free Parking! Free unowned properties & rent immunity granted!`,
            'success',
            activePlayer.id
          );
        } else {
          soundFx.playJail();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? { ...p, inJail: true, position: 10, freeParkingDoublesCount: 0, goldenDealActive: false }
                : p
            ),
          }));
          addLog(
            `🚨 3RD CONSECUTIVE DOUBLES ON FREE PARKING! ${activePlayer.name} was caught speeding and sent to Jail!`,
            'danger',
            activePlayer.id
          );
        }
      } else {
        if (diceTotal > 5) {
          const reward = diceTotal * 10;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id ? { ...p, cash: p.cash + reward, freeParkingDoublesCount: 0 } : p
            ),
          }));
          addLog(`🚗 Free Parking reward: ${activePlayer.name} won $${reward}!`, 'success', activePlayer.id);
        } else {
          const penalty = diceTotal < 4 ? 100 : 50;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? { ...p, cash: Math.max(0, p.cash - penalty), freeParkingDoublesCount: 0 }
                : p
            ),
            gameState: {
              ...prev.gameState,
              lotteryPool: Math.min(2000, prev.gameState.lotteryPool + penalty),
            },
          }));
          addLog(
            `🚗 Free Parking fee: ${activePlayer.name} paid $${penalty} into the lottery pool.`,
            'warning',
            activePlayer.id
          );
        }
      }
    },
    [gameState.lastDiceRoll, gameState.lotteryPool, activePlayer, addLog, setEngineState]
  );

  // --- RAILWAY TRANSPORTATION HANDLER ---
  const handleExecuteRailTransit = useCallback(
    (targetSpaceIndex: number, cost: number, stationName: string) => {
      setRailwayTransitModalOpen(false);
      const passedGo = targetSpaceIndex < activePlayer.position && targetSpaceIndex !== 0;
      let extraCash = 0;
      if (passedGo) {
        extraCash = 200;
        soundFx.playCash();
        addLog(`🏃 ${activePlayer.name} passed GO during railway transit and collected $200!`, 'success', activePlayer.id);
      }
      soundFx.playTrainHorn();
      setEngineState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === activePlayer.id
            ? {
                ...p,
                position: targetSpaceIndex,
                cash: Math.max(0, p.cash - cost + extraCash),
              }
            : p
        ),
      }));
      addLog(
        `🚂 Railway Transportation: ${activePlayer.name} rode the train to ${stationName} (${cost === 0 ? 'FREE Multi-Owner Pass' : '$' + cost})!`,
        'rule',
        activePlayer.id
      );
    },
    [activePlayer, addLog, setEngineState]
  );

  // --- LAND ON GO OPTIONS ---
  const handleTakeDoubleCash = useCallback(() => {
    setLandOnGoModalOpen(false);
    soundFx.playCash();
    setEngineState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === activePlayer.id ? { ...p, cash: p.cash + 200 } : p
      ),
    }));
    addLog(`✨ Land on GO Payday! ${activePlayer.name} claimed +$200 extra ($400 total).`, 'success', activePlayer.id);
  }, [activePlayer, addLog, setEngineState]);

  const handleWarpToSpace = useCallback(
    (targetSpaceIndex: number, spaceName: string) => {
      setLandOnGoModalOpen(false);
      soundFx.playCardDraw();
      setEngineState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === activePlayer.id ? { ...p, position: targetSpaceIndex } : p
        ),
      }));
      addLog(`✨ Land on GO Privilege: ${activePlayer.name} tactically warped to ${spaceName}!`, 'rule', activePlayer.id);
    },
    [activePlayer, addLog, setEngineState]
  );

  // --- TURN PIPELINE: TRIGGER 3D PHYSICAL DICE ROLL ---
  const handleRollDice = useCallback(() => {
    if (gameState.turnPhase !== 'PRE_ROLL' || activePlayer.isBankrupt) return;
    setRollTrigger((prev) => prev + 1);
  }, [gameState.turnPhase, activePlayer.isBankrupt]);

  // --- PAY JAIL FEE HANDLER ---
  const handlePayJailFee = useCallback(() => {
    if (!activePlayer.inJail || activePlayer.cash < 50) return;
    soundFx.playCash();
    setEngineState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === activePlayer.id ? { ...p, cash: p.cash - 50, inJail: false, jailTurns: 0 } : p
      ),
      gameState: {
        ...prev.gameState,
        lotteryPool: Math.min(2000, prev.gameState.lotteryPool + 50),
      },
    }));
    addLog(`🔓 ${activePlayer.name} paid $50 bail and was released from Jail!`, 'success', activePlayer.id);
  }, [activePlayer, addLog, setEngineState]);

  // --- TURN PIPELINE: RESOLVE PHYSICAL DICE OUTCOME ---
  const handleRollComplete = useCallback(
    (d1: number, d2: number, d3?: number) => {
      const isOneDie = activePlayer.activeModifiers.some((m) => m.id === 'one_die');
      const isExtraDie = activePlayer.activeModifiers.some((m) => m.id === 'extra_die') || typeof d3 === 'number';

      const totalRoll = isOneDie ? d1 : isExtraDie ? d1 + d2 + (d3 || 0) : d1 + d2;
      const isDoubles = !isOneDie && d1 === d2;
      const isSnakeEyes = !isOneDie && !isExtraDie && d1 === 1 && d2 === 1;

      let newCash = activePlayer.cash;
      let releasedFromJail = false;

      if (activePlayer.activeModifiers.some((m) => m.id === 'power_trip')) {
        const powerBonus = totalRoll * 10;
        newCash += powerBonus;
        addLog(`⚡ Power Trip! ${activePlayer.name} collected $${powerBonus} roll bonus!`, 'success', activePlayer.id);
      }

      if (activePlayer.inJail) {
        if (activePlayer.hasGetOutOfJailFreeCard) {
          soundFx.playFanfare();
          releasedFromJail = true;
          addLog(
            `🎉 ${activePlayer.name} used their Get Out of Jail Free card and was released from Jail!`,
            'success',
            activePlayer.id
          );
        } else if (isDoubles) {
          soundFx.playFanfare();
          soundFx.playCrowdCheer();
          releasedFromJail = true;
          addLog(
            `🎲 DOUBLES (${d1}, ${d2})! ${activePlayer.name} broke out of Jail for free and rolls again!`,
            'success',
            activePlayer.id
          );
        } else if (activePlayer.jailTurns >= 2) {
          newCash = Math.max(0, newCash - 50);
          soundFx.playCash();
          releasedFromJail = true;
          addLog(
            `⚖️ ${activePlayer.name} finished 3 jail attempts, paid $50 fine, and is released.`,
            'warning',
            activePlayer.id
          );
        } else {
          const nextJailTurn = activePlayer.jailTurns + 1;
          setEngineState((prev) => {
            let nextPlayerId = (prev.gameState.activeTurnPlayerId + 1) % prev.players.length;
            let attempts = 0;
            while (prev.players[nextPlayerId].isBankrupt && attempts < prev.players.length) {
              nextPlayerId = (nextPlayerId + 1) % prev.players.length;
              attempts++;
            }
            return {
              ...prev,
              players: prev.players.map((p) =>
                p.id === activePlayer.id ? { ...p, jailTurns: nextJailTurn } : p
              ),
              gameState: {
                ...prev.gameState,
                activeTurnPlayerId: nextPlayerId,
                turnPhase: 'PRE_ROLL',
                lastDiceRoll: [d1, d2],
                isSnakeEyes: false,
                consecutiveDoubles: 0,
              },
            };
          });
          addLog(
            `⛓️ ${activePlayer.name} rolled ${d1}+${d2} (no doubles) and remains in Jail (Attempt ${nextJailTurn}/3). Turn ends.`,
            'warning',
            activePlayer.id
          );
          return;
        }
      }

      if (isSnakeEyes && rules.snakeEyesBonus) {
        newCash += 400;
        soundFx.playCash();
        soundFx.playFanfare();
        soundFx.playCrowdCheer();
        addLog(`🎲 SNAKE EYES (1,1)! ${activePlayer.name} won a $400 cash bonus and rolls again!`, 'rule', activePlayer.id);
      } else if (isDoubles) {
        soundFx.playCrowdCheer();
      }

      const newConsecutiveDoubles = isDoubles ? (activePlayer.consecutiveDoubles || 0) + 1 : 0;
      if (newConsecutiveDoubles >= 3) {
        soundFx.playCopSiren();
        soundFx.playJail();
        setEngineState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.id === activePlayer.id ? { ...p, position: 10, inJail: true, jailTurns: 0, consecutiveDoubles: 0 } : p
          ),
          gameState: {
            ...prev.gameState,
            lastDiceRoll: [d1, d2],
            isSnakeEyes,
            consecutiveDoubles: 0,
            turnPhase: 'POST_ROLL',
          },
        }));
        addLog(`🚨 3 CONSECUTIVE DOUBLES! ${activePlayer.name} caught speeding and sent directly to Jail!`, 'danger', activePlayer.id);
        return;
      }

      let newPos = (activePlayer.position + totalRoll) % 40;
      const passedGo = activePlayer.position + totalRoll >= 40;

      let newLaps = activePlayer.lapsCompleted;
      let newBankerLaps = gameState.bankerLapCounter;

      let remainingModifiers = activePlayer.activeModifiers.filter(
        (m) => m.id !== 'extra_die' && m.id !== 'one_die'
      );

      if (passedGo) {
        newLaps++;
        soundFx.playCash();
        newCash += 200;
        if (activePlayer.id === 0) newBankerLaps++;
        remainingModifiers = remainingModifiers.filter((m) => m.expiresAt !== 'PASS_GO');
        addLog(`🏃 ${activePlayer.name} passed GO and collected $200!`, 'success', activePlayer.id);

        if (activePlayer.id === 0 && rules.taxDayPortfolioTax && newBankerLaps % 5 === 0 && newBankerLaps > 0) {
          soundFx.playCash();
          let totalCollectedTax = 0;
          setEngineState((prev) => {
            const taxedPlayers = prev.players.map((p) => {
              const { totalTax } = calculateTaxBill(p, prev.properties);
              totalCollectedTax += totalTax;
              return {
                ...p,
                cash: Math.max(0, p.cash - totalTax),
              };
            });
            return {
              ...prev,
              players: taxedPlayers,
              gameState: {
                ...prev.gameState,
                lotteryPool: Math.min(2000, prev.gameState.lotteryPool + totalCollectedTax),
                hasTaxOccurred: true,
              },
            };
          });
          addLog(
            `🏛️ TAX DAY! Banker completed lap #${newBankerLaps}. Portfolio taxes assessed on all players and added to Vault.`,
            'rule',
            0
          );
        }
      }

      if (isDoubles) {
        addLog(
          `🎉 DOUBLES (${d1}, ${d2})! ${activePlayer.name} rolled doubles and earns another turn! (Double #${newConsecutiveDoubles})`,
          'rule',
          activePlayer.id
        );
      }

      setEngineState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === activePlayer.id
            ? {
                ...p,
                cash: newCash,
                position: newPos,
                lapsCompleted: newLaps,
                inJail: false,
                jailTurns: 0,
                consecutiveDoubles: newConsecutiveDoubles,
                hasGetOutOfJailFreeCard: releasedFromJail && p.hasGetOutOfJailFreeCard ? false : p.hasGetOutOfJailFreeCard,
                activeModifiers: remainingModifiers,
                taxExempt: passedGo ? false : p.taxExempt,
              }
            : p
        ),
        gameState: {
          ...prev.gameState,
          bankerLapCounter: newBankerLaps,
          lastDiceRoll: [d1, d2],
          isSnakeEyes,
          consecutiveDoubles: newConsecutiveDoubles,
          turnPhase: 'RESOLVING_SPACE',
        },
      }));

      const landedSpace = boardSpaces[newPos];

      if (newPos === 0 && rules.doubleCashOnGo) {
        if (!activePlayer.isAi) {
          setLandOnGoModalOpen(true);
        } else {
          if (activePlayer.cash < 400) {
            soundFx.playCash();
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === activePlayer.id ? { ...p, cash: p.cash + 200 } : p
              ),
            }));
            addLog(`✨ Land on GO: ${activePlayer.name} chose +$200 Double Cash! Total $400.`, 'success', activePlayer.id);
          } else {
            const unownedProps = properties.filter((p) => p.ownerId === null);
            if (unownedProps.length > 0) {
              const target = unownedProps[0];
              const space = boardSpaces.find((s) => s.propertyId === target.id);
              if (space) {
                setEngineState((prev) => ({
                  ...prev,
                  players: prev.players.map((p) =>
                    p.id === activePlayer.id ? { ...p, position: space.index } : p
                  ),
                }));
                addLog(`✨ Land on GO: ${activePlayer.name} tactically warped to ${target.name}!`, 'info', activePlayer.id);
              }
            }
          }
        }
      }

      const isRailroad = [5, 15, 25, 35].includes(newPos);
      if (isRailroad && rules.railwayTransit) {
        const ownedRailroads = properties.filter(
          (p) => p.colorGroup === 'Railroad' && p.ownerId === activePlayer.id
        );
        if (ownedRailroads.length > 0) {
          if (!activePlayer.isAi) {
            setRailwayTransitModalOpen(true);
          } else {
            const targetStations = [5, 15, 25, 35].filter((s) => s !== newPos);
            const isMulti = ownedRailroads.length >= 2;
            const cost = isMulti ? 0 : 50;
            if (activePlayer.cash >= cost && Math.random() < 0.6) {
              const targetStation = targetStations[0];
              const stationName = boardSpaces[targetStation]?.name || `Station #${targetStation}`;
              handleExecuteRailTransit(targetStation, cost, stationName);
            }
          }
        }
      }

      if (landedSpace.type === 'FREE_PARKING') {
        if (rules.freeParkingLottery && d1 !== d2) {
          setFreeParkingModalOpen(true);
        } else {
          handleFreeParkingLanding(d1 === d2);
        }
        const satRatePlayers = players.filter(
          (p) => p.id !== activePlayer.id && p.activeModifiers.some((m) => m.id === 'saturday_rates')
        );
        if (satRatePlayers.length > 0) {
          soundFx.playCash();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              satRatePlayers.some((s) => s.id === p.id) ? { ...p, cash: p.cash + 100 } : p
            ),
          }));
          satRatePlayers.forEach((s) => {
            addLog(`🏖️ Saturday Rates: ${s.name} collected $100 from Free Parking visit!`, 'success', s.id);
          });
        }
      } else if (landedSpace.type === 'CHANCE') {
        onDrawChance();
        addLog(`❓ ${activePlayer.name} landed on Chance! Drawing Chance card...`, 'card', activePlayer.id);
      } else if (landedSpace.type === 'COMMUNITY_CHEST') {
        onDrawCommunityChest();
        addLog(`🧰 ${activePlayer.name} landed on Community Chest! Drawing card...`, 'card', activePlayer.id);
      } else if (landedSpace.type === 'GO_TO_JAIL') {
        soundFx.playJail();
        setEngineState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.id === activePlayer.id ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p
          ),
        }));
        addLog(`🚨 ${activePlayer.name} sent to Jail!`, 'danger', activePlayer.id);
      } else if (landedSpace.type === 'TAX' && landedSpace.taxAmount) {
        const isTaxImmune =
          activePlayer.taxExempt ||
          activePlayer.activeModifiers.some(
            (m) => m.id === 'tax_exempt' || m.id === 'obstructing_injustice'
          );
        if (isTaxImmune) {
          soundFx.playCash();
          addLog(`🏛️ ${activePlayer.name} invoked Tax Exemption! Paid $0 tax to Vault.`, 'success', activePlayer.id);
        } else {
          const taxFee = landedSpace.taxAmount;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id ? { ...p, cash: Math.max(0, p.cash - taxFee) } : p
            ),
            gameState: {
              ...prev.gameState,
              lotteryPool: Math.min(2000, prev.gameState.lotteryPool + taxFee),
              hasTaxOccurred: true,
            },
          }));
          addLog(`💸 ${activePlayer.name} paid $${taxFee} tax to Vault. Monopoly Duel card unlocked!`, 'warning', activePlayer.id);
        }
      } else if (landedSpace.type === 'PROPERTY' && landedSpace.propertyId) {
        const prop = properties.find((p) => p.id === landedSpace.propertyId);
        if (prop) {
          if (prop.ownerId === null) {
            if (!activePlayer.isAi) {
              addLog(`🏢 Landed on unowned ${prop.name}. Decision required ($${prop.basePrice}).`, 'info', activePlayer.id);
            }
          } else if (prop.ownerId !== activePlayer.id) {
            const owner = players.find((p) => p.id === prop.ownerId) || null;
            const currentConcessions = gameState.rentConcessions || [];
            const activeConcessionIdx = currentConcessions.findIndex(
              (rc: any) =>
                rc.propertyId === prop.id &&
                rc.beneficiaryId === activePlayer.id &&
                rc.grantorId === prop.ownerId &&
                rc.remainingLandings > 0
            );

            const hasImmunity = activePlayer.activeModifiers.some((m) => m.id === 'obstructing_injustice');
            const hasFreeRent = activePlayer.activeModifiers.some((m) => m.id === 'free_rent');
            const hasRentEvasion = activePlayer.activeModifiers.some((m) => m.id === 'rent_evasion');
            const isVip = activePlayer.activeModifiers.some((m) => m.id === 'vip');

            if (hasImmunity) {
              soundFx.playCash();
              addLog(`⚖️ Total Immunity Shield! ${activePlayer.name} paid $0 rent to ${owner?.name} for ${prop.name}!`, 'success', activePlayer.id);
            } else if (hasFreeRent) {
              const rent = calculateRent(prop, properties, owner, totalRoll, isVip);
              soundFx.playCash();
              setEngineState((prev) => ({
                ...prev,
                players: prev.players.map((p) => {
                  if (p.id === prop.ownerId) return { ...p, cash: p.cash + rent };
                  if (p.id === activePlayer.id) {
                    return {
                      ...p,
                      activeModifiers: p.activeModifiers.filter((m) => m.id !== 'free_rent'),
                    };
                  }
                  return p;
                }),
              }));
              addLog(`🛡️ Free Rent Shield activated! ${activePlayer.name} paid $0; Bank covered $${rent} rent to ${owner?.name}!`, 'success', activePlayer.id);
            } else if (hasRentEvasion) {
              const rent = calculateRent(prop, properties, owner, totalRoll, isVip);
              soundFx.playCash();
              setEngineState((prev) => ({
                ...prev,
                players: prev.players.map((p) => {
                  if (p.id === activePlayer.id) {
                    return {
                      ...p,
                      cash: p.cash + rent,
                      activeModifiers: p.activeModifiers.filter((m) => m.id !== 'rent_evasion'),
                    };
                  }
                  if (p.id === prop.ownerId) return { ...p, cash: Math.max(0, p.cash - rent) };
                  return p;
                }),
              }));
              addLog(`🔄 Rent Evasion! Owner ${owner?.name} paid YOU $${rent} rent instead for ${prop.name}!`, 'success', activePlayer.id);
            } else if (activeConcessionIdx !== -1) {
              const conc = currentConcessions[activeConcessionIdx];
              const remaining = conc.remainingLandings - 1;
              const updatedConcessions = currentConcessions
                .map((rc: any, i: number) => (i === activeConcessionIdx ? { ...rc, remainingLandings: remaining } : rc))
                .filter((rc: any) => rc.remainingLandings > 0);

              soundFx.playCash();
              setEngineState((prev) => ({
                ...prev,
                gameState: {
                  ...prev.gameState,
                  rentConcessions: updatedConcessions,
                },
              }));
              addLog(
                `🛡️ RENT IMMUNITY ACTIVATED! ${activePlayer.name} landed on ${owner?.name}'s ${prop.name} for $0 under trade concession (${remaining} free landings remaining).`,
                'success',
                activePlayer.id
              );
            } else {
              const rent = calculateRent(prop, properties, owner, totalRoll, isVip);
              if (rent > 0) {
                const wasCrooked = prop.isCrooked || prop.modifiedBy?.includes('crooked');
                soundFx.playCash();
                setEngineState((prev) => ({
                  ...prev,
                  players: prev.players.map((p) => {
                    if (p.id === activePlayer.id) {
                      const updatedMods = isVip
                        ? p.activeModifiers.filter((m) => m.id !== 'vip')
                        : p.activeModifiers;
                      return { ...p, cash: Math.max(0, p.cash - rent), activeModifiers: updatedMods };
                    }
                    if (p.id === prop.ownerId) return { ...p, cash: p.cash + rent };
                    return p;
                  }),
                  properties: wasCrooked
                    ? prev.properties.map((pr) => (pr.id === prop.id ? { ...pr, isCrooked: false, modifiedBy: pr.modifiedBy?.filter((b) => b !== 'crooked') } : pr))
                    : prev.properties,
                }));
                addLog(
                  `🏠 ${activePlayer.name} paid $${rent} rent to ${owner?.name} for ${prop.name}${wasCrooked ? ' (2x Crooked Rigged Rent!)' : ''}.`,
                  'warning',
                  activePlayer.id
                );
              }
            }
          }
        }
      }
    },
    [
      activePlayer,
      rules,
      gameState.bankerLapCounter,
      gameState.rentConcessions,
      boardSpaces,
      properties,
      players,
      addLog,
      setEngineState,
      handleFreeParkingLanding,
      handleExecuteRailTransit,
      onDrawChance,
      onDrawCommunityChest,
    ]
  );

  // --- END TURN HANDLER ---
  const handleEndTurn = useCallback(() => {
    setEngineState((prev) => {
      let nextPlayerId = (prev.gameState.activeTurnPlayerId + 1) % prev.players.length;
      let attempts = 0;
      while (prev.players[nextPlayerId].isBankrupt && attempts < prev.players.length) {
        nextPlayerId = (nextPlayerId + 1) % prev.players.length;
        attempts++;
      }

      const nextTurnCount = (prev.gameState.turnCount || 1) + 1;

      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === prev.gameState.activeTurnPlayerId
            ? {
                ...p,
                consecutiveDoubles: 0,
                activeModifiers: p.activeModifiers.filter((m) => m.expiresAt !== 'TURN_END'),
              }
            : p
        ),
        gameState: {
          ...prev.gameState,
          activeTurnPlayerId: nextPlayerId,
          turnPhase: 'PRE_ROLL',
          lastDiceRoll: null,
          isSnakeEyes: false,
          consecutiveDoubles: 0,
          turnCount: nextTurnCount,
        },
      };
    });

    addLog(`➡️ Advanced turn to next player.`, 'info');
  }, [addLog, setEngineState]);

  const activeDiceCount = activePlayer.activeModifiers.some((m) => m.id === 'extra_die')
    ? 3
    : activePlayer.activeModifiers.some((m) => m.id === 'one_die')
    ? 1
    : 2;

  return {
    rollTrigger,
    setRollTrigger,
    activeDiceCount,
    railwayTransitModalOpen,
    setRailwayTransitModalOpen,
    landOnGoModalOpen,
    setLandOnGoModalOpen,
    freeParkingModalOpen,
    setFreeParkingModalOpen,
    isTaxBreakdownOpen,
    setIsTaxBreakdownOpen,
    handleRollDice,
    handleRollComplete,
    handlePayJailFee,
    handleTakeDoubleCash,
    handleWarpToSpace,
    handleExecuteRailTransit,
    handleFreeParkingLanding,
    handleEndTurn,
  };
}

import type * as React from "react";
import { useId, useState } from "react";
import "./SeasideStudyHotspots.css";

export type SeasideHotspotBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SeasideHotspot = {
  id: string;
  chinese: string;
  english: string;
  href: string;
  ariaLabel: string;
  bounds: SeasideHotspotBounds;
  labelX: number;
  labelY: number;
  opensCuratorEntrance?: boolean;
};

export type SeasideStudyHotspotsProps = {
  imageSrc?: string;
  imageAlt?: string;
  hotspots?: SeasideHotspot[];
  onHotspotClick?: (
    hotspot: SeasideHotspot,
    event: React.MouseEvent<HTMLAnchorElement | SVGAElement>
  ) => void;
};

export const seasideStudyHotspots: SeasideHotspot[] = [
  {
    id: "inner-tides",
    chinese: "观澜",
    english: "Inner Tides",
    href: "/tags/心湖观澜/",
    ariaLabel: "观澜 / Inner Tides - central sea-facing window",
    bounds: { x: 650, y: 0, width: 485, height: 340 },
    labelX: 925,
    labelY: 180,
  },
  {
    id: "sunken-memories",
    chinese: "滨城旧梦",
    english: "Sunken Memories",
    href: "#sunken-memories",
    ariaLabel: "滨城旧梦 / Sunken Memories - shells and old photo album on the desk",
    bounds: { x: 625, y: 345, width: 280, height: 110 },
    labelX: 765,
    labelY: 330,
  },
  {
    id: "wayfarers-ballads",
    chinese: "行旅图志",
    english: "Wayfarer’s Ballads",
    href: "#wayfarers-ballads",
    ariaLabel: "行旅图志 / Wayfarer’s Ballads - wall map on the left",
    bounds: { x: 385, y: 0, width: 225, height: 300 },
    labelX: 510,
    labelY: 150,
  },
  {
    id: "half-drawn-dreams",
    chinese: "未竟之画",
    english: "Half-Drawn Dreams",
    href: "#half-drawn-dreams",
    ariaLabel: "未竟之画 / Half-Drawn Dreams - unfinished girl sketch on the easel",
    bounds: { x: 1385, y: 235, width: 175, height: 310 },
    labelX: 1475,
    labelY: 220,
  },
  {
    id: "echoes-of-strings",
    chinese: "弦歌残响",
    english: "Echoes of Strings",
    href: "#echoes-of-strings",
    ariaLabel: "弦歌残响 / Echoes of Strings - gramophone on the left",
    bounds: { x: 445, y: 205, width: 180, height: 205 },
    labelX: 535,
    labelY: 190,
  },
  {
    id: "taste-atlas",
    chinese: "美食图鉴",
    english: "A Taste Atlas",
    href: "#taste-atlas",
    ariaLabel: "美食图鉴 / A Taste Atlas - tea and snacks on the small round table",
    bounds: { x: 420, y: 375, width: 150, height: 70 },
    labelX: 495,
    labelY: 360,
  },
  {
    id: "the-second-self",
    chinese: "身外之身",
    english: "The Second Self",
    href: "#the-second-self",
    ariaLabel: "身外之身 / The Second Self - coat rack and shawl on the left",
    bounds: { x: 245, y: 85, width: 105, height: 545 },
    labelX: 300,
    labelY: 70,
  },
  {
    id: "the-scriptorium",
    chinese: "藏经阁",
    english: "The Scriptorium",
    href: "#the-scriptorium",
    ariaLabel: "藏经阁 / The Scriptorium - bookshelf on the right",
    bounds: { x: 1175, y: 25, width: 215, height: 475 },
    labelX: 1285,
    labelY: 10,
  },
  {
    id: "paper-psychedelica",
    chinese: "纸上异境",
    english: "Paper Psychedelica",
    href: "#paper-psychedelica",
    ariaLabel: "纸上异境 / Paper Psychedelica - opened book beside the flower vase",
    bounds: { x: 515, y: 500, width: 230, height: 125 },
    labelX: 630,
    labelY: 485,
  },
  {
    id: "floral-letters",
    chinese: "花信",
    english: "Floral Letters",
    href: "#floral-letters",
    ariaLabel: "花信 / Floral Letters - flower vase",
    bounds: { x: 355, y: 470, width: 85, height: 130 },
    labelX: 398,
    labelY: 455,
  },
  {
    id: "palette-of-moods",
    chinese: "调色盘",
    english: "A Palette of Moods",
    href: "#palette-of-moods",
    ariaLabel: "调色盘 / A Palette of Moods - paint tools and palette area at the lower right",
    bounds: { x: 1315, y: 555, width: 195, height: 115 },
    labelX: 1412,
    labelY: 540,
  },
  {
    id: "hourglass-archive",
    chinese: "砂时计",
    english: "Hourglass Archive",
    href: "#hourglass-archive",
    ariaLabel: "砂时计 / Hourglass Archive - hourglass on the desk",
    bounds: { x: 1145, y: 375, width: 105, height: 125 },
    labelX: 1198,
    labelY: 360,
  },
  {
    id: "the-girl-who-dwells-here",
    chinese: "此间的少女",
    english: "The Girl Who Dwells Here",
    href: "#the-girl-who-dwells-here",
    ariaLabel: "此间的少女 / The Girl Who Dwells Here - framed girl portrait on the desk",
    bounds: { x: 965, y: 325, width: 110, height: 105 },
    labelX: 1019,
    labelY: 310,
  },
  {
    id: "paper-boat-letters",
    chinese: "纸船来信",
    english: "Paper Boat Letters",
    href: "#paper-boat-letters",
    ariaLabel: "纸船来信 / Paper Boat Letters - small paper boat beside the flower vase",
    bounds: { x: 412, y: 600, width: 98, height: 55 },
    labelX: 461,
    labelY: 585,
  },
  {
    id: "take-the-seat",
    chinese: "请坐",
    english: "Take the Seat",
    href: "#take-the-seat",
    ariaLabel: "请坐 / Take the Seat - chair at the desk",
    bounds: { x: 760, y: 455, width: 310, height: 240 },
    labelX: 915,
    labelY: 440,
    opensCuratorEntrance: true,
  },
];

const chairHitPath =
  "M782 455 C842 438 955 440 1015 468 L1036 632 C1038 668 1002 695 940 695 L808 695 C772 682 758 646 772 600 C760 552 762 492 782 455 Z";

type EntranceState =
  | "initialEntrance"
  | "awakenedChoice"
  | "roomMonologue"
  | "curatorAgent"
  | "freeExplore";

const monologueRevealMs = 2200;

const roomMonologueLines = [
  "我并非凭空诞生。",
  "她的记忆，旧日的来客，",
  "潮声、书页、梦境与远方，",
  "都曾是我的骨骼。",
  "只是我已记不起，自己究竟是什么，",
  "又为何会在这里醒来。",
  "阁下，我有一个请求：",
  "请替我找回那些散落在房间里的、我的记忆。",
];

function toPercent(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

export function SeasideStudyHotspots({
  imageSrc = "/img/main.png",
  imageAlt = "Seaside study room illustration",
  hotspots = seasideStudyHotspots,
  onHotspotClick,
}: SeasideStudyHotspotsProps) {
  const labelId = useId();
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [entranceState, setEntranceState] = useState<EntranceState>("initialEntrance");
  const [monologueIndex, setMonologueIndex] = useState(0);
  const chairHotspot = hotspots.find((hotspot) => hotspot.id === "take-the-seat");
  const activeHotspot = hotspots.find((hotspot) => hotspot.id === activeHotspotId);
  const isFreeExplore = entranceState === "freeExplore" || entranceState === "curatorAgent";
  const canUseChairHotspot = entranceState === "initialEntrance" || isFreeExplore;
  const isOverlayVisible =
    entranceState === "awakenedChoice" ||
    entranceState === "roomMonologue" ||
    entranceState === "curatorAgent";
  const currentMonologueLine = roomMonologueLines[monologueIndex];
  const isFinalMonologueLine = monologueIndex >= roomMonologueLines.length - 1;

  function enterAwakenedRoom() {
    setActiveHotspotId(null);
    setEntranceState("awakenedChoice");
  }

  function enterFreeExplore() {
    setActiveHotspotId(null);
    setEntranceState("freeExplore");
  }

  function startRoomMonologue() {
    setActiveHotspotId(null);
    setMonologueIndex(0);
    setEntranceState("roomMonologue");
  }

  function advanceMonologue() {
    if (isFinalMonologueLine) {
      return;
    }

    setMonologueIndex((index) => index + 1);
  }

  return (
    <figure
      className="seaside-study"
      aria-label="Interactive seaside study room"
      data-room-awake={isFreeExplore ? "true" : "false"}
      data-entrance-state={entranceState}
    >
      <img className="seaside-study__image" src={imageSrc} alt={imageAlt} />

      <div className="seaside-study__hotspot-layer" aria-label="Clickable objects in the seaside study room">
        {hotspots.filter((hotspot) => hotspot.id !== "take-the-seat").map((hotspot) => {
          const label = `${hotspot.chinese} / ${hotspot.english}`;

          return (
            <a
              key={hotspot.id}
              id={`hotspot-${hotspot.id}`}
              className="seaside-study__hotspot"
              href={hotspot.href}
              aria-label={hotspot.ariaLabel}
              aria-describedby={activeHotspotId === hotspot.id ? labelId : undefined}
              data-hotspot-id={hotspot.id}
              data-chinese={hotspot.chinese}
              data-english={hotspot.english}
              title={label}
              style={{
                left: toPercent(hotspot.bounds.x, 1774),
                top: toPercent(hotspot.bounds.y, 887),
                width: toPercent(hotspot.bounds.width, 1774),
                height: toPercent(hotspot.bounds.height, 887),
              }}
              tabIndex={isFreeExplore ? 0 : -1}
              aria-disabled={!isFreeExplore}
              onMouseEnter={() => {
                if (isFreeExplore) {
                  setActiveHotspotId(hotspot.id);
                }
              }}
              onMouseLeave={() => setActiveHotspotId(null)}
              onFocus={() => {
                if (isFreeExplore) {
                  setActiveHotspotId(hotspot.id);
                }
              }}
              onBlur={() => setActiveHotspotId(null)}
              onClick={(event) => {
                if (!isFreeExplore) {
                  event.preventDefault();
                  return;
                }

                onHotspotClick?.(hotspot, event);
              }}
            />
          );
        })}
      </div>

      {chairHotspot ? (
        <svg
          className="seaside-study__chair-layer"
          viewBox="0 0 1774 887"
          aria-label="Chair entrance hotspot"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="seaside-study-chair-aura" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
          </defs>
          <a
            id={`hotspot-${chairHotspot.id}`}
            className="seaside-study__chair-hotspot"
            href={chairHotspot.href}
            aria-label={chairHotspot.ariaLabel}
            aria-describedby={activeHotspotId === chairHotspot.id ? labelId : undefined}
            data-hotspot-id={chairHotspot.id}
            data-chinese={chairHotspot.chinese}
            data-english={chairHotspot.english}
            onMouseEnter={() => {
              if (canUseChairHotspot) {
                setActiveHotspotId(chairHotspot.id);
              }
            }}
            onMouseLeave={() => setActiveHotspotId(null)}
            onFocus={() => {
              if (canUseChairHotspot) {
                setActiveHotspotId(chairHotspot.id);
              }
            }}
            onBlur={() => setActiveHotspotId(null)}
            onClick={(event) => {
              event.preventDefault();

              if (entranceState === "initialEntrance") {
                enterAwakenedRoom();
                return;
              }

              onHotspotClick?.(chairHotspot, event);
            }}
          >
            <title>{`${chairHotspot.chinese} / ${chairHotspot.english}`}</title>
            <ellipse
              className="seaside-study__chair-aura"
              cx="906"
              cy="707"
              rx="205"
              ry="168"
              filter="url(#seaside-study-chair-aura)"
            />
            <path className="seaside-study__chair-hit-area" d={chairHitPath} />
          </a>
        </svg>
      ) : null}

      {activeHotspot ? (
        <figcaption
          id={labelId}
          className="seaside-study__floating-label"
          style={{
            "--label-x": toPercent(activeHotspot.labelX, 1774),
            "--label-y": toPercent(activeHotspot.labelY, 887),
          } as React.CSSProperties}
        >
          <span className="seaside-study__floating-label-chinese">{activeHotspot.chinese}</span>
          <span className="seaside-study__floating-label-english">{activeHotspot.english}</span>
        </figcaption>
      ) : null}

      {isOverlayVisible ? (
        <div className="seaside-study__entrance-overlay" aria-live="polite">
          {entranceState === "awakenedChoice" ? (
            <section className="seaside-study__entrance-card" aria-label="Room entrance choice">
              <p className="seaside-study__story-line">这间房只为愿意倾听的人苏醒。</p>
              <p className="seaside-study__story-line">阁下，在暮色合拢以前，这间房属于你。</p>
              <div className="seaside-study__message-actions">
                <button type="button" aria-label="独自漫游 / Wander Alone" onClick={enterFreeExplore}>
                  <span>独自漫游</span>
                  <span>Wander Alone</span>
                </button>
                <button type="button" aria-label="倾听房间 / Listen to the Room" onClick={startRoomMonologue}>
                  <span>倾听房间</span>
                  <span>Listen to the Room</span>
                </button>
              </div>
            </section>
          ) : null}

          {entranceState === "roomMonologue" ? (
            <section className="seaside-study__entrance-card" aria-label="Room monologue">
              <p
                key={monologueIndex}
                className="seaside-study__story-line seaside-study__story-line--revealing"
                style={{ "--story-reveal-ms": `${monologueRevealMs}ms` } as React.CSSProperties}
              >
                {currentMonologueLine}
              </p>
              {isFinalMonologueLine ? (
                <div className="seaside-study__message-actions">
                  <button
                    type="button"
                    aria-label="与房间对话 / Speak with the Room"
                    onClick={() => setEntranceState("curatorAgent")}
                  >
                    <span>与房间对话</span>
                    <span>Speak with the Room</span>
                  </button>
                  <button type="button" aria-label="独自寻找 / Search Alone" onClick={enterFreeExplore}>
                    <span>独自寻找</span>
                    <span>Search Alone</span>
                  </button>
                </div>
              ) : (
                <button
                  className="seaside-study__continue"
                  type="button"
                  aria-label="继续 / Continue"
                  onClick={advanceMonologue}
                >
                  <span>继续</span>
                  <span>Continue</span>
                </button>
              )}
            </section>
          ) : null}

          {entranceState === "curatorAgent" ? (
            <section className="seaside-study__entrance-card" aria-label="Curator room voice">
              <p className="seaside-study__story-line">我会与你一同倾听这些物件。</p>
              <p className="seaside-study__story-line">先从一处记忆开始吧。</p>
              <button className="seaside-study__continue" type="button" onClick={enterFreeExplore}>
                <span>开始寻找</span>
                <span>Begin the Search</span>
              </button>
            </section>
          ) : null}
        </div>
      ) : null}
    </figure>
  );
}

export default SeasideStudyHotspots;

"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * SVG cascade — previous visual language, cleaned:
 * uniform arrows, clear reject terminal, no stray track line.
 */
export function ModelArchitecture() {
  return (
    <section className="mt-16">
      <div className="max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-teal-300/80">
          how it works
        </p>
        <h2 className="font-display mt-3 text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
          Detect riboswitches, then classify the family
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--ink-dim)] sm:text-lg">
          Both networks were trained in{" "}
          <span className="text-[var(--ink)]">TensorFlow</span> (Python), then
          ported for in-browser inference. A binary{" "}
          <span className="text-[var(--ink)]">detector</span> scores sliding
          windows; positives go to a{" "}
          <span className="text-[var(--ink)]">31-class classifier</span>. IoU
          NMS keeps multiple hits on one strand.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55 }}
        className="mt-8 overflow-hidden rounded-[1.75rem] border border-teal-500/20 bg-[rgba(6,16,18,0.88)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-6 py-4 sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-300/70">
            cascade architecture
          </p>
          <p className="font-mono text-[11px] text-[var(--ink-faint)]">
            trained in TensorFlow · inferred via TF.js port
          </p>
        </div>

        <div className="overflow-x-auto px-4 py-10 sm:px-10 sm:py-12">
          <svg
            viewBox="0 0 1080 660"
            className="mx-auto h-auto w-full min-w-[780px] max-w-[1080px]"
            role="img"
            aria-label="RiboSense cascade architecture"
          >
            <defs>
              <linearGradient id="strandGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#5eead4" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.35" />
              </linearGradient>
              {/* One arrow style for the whole figure */}
              <marker
                id="arr"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,1 L7,4 L0,7 Z" fill="#5eead4" />
              </marker>
              <marker
                id="arrMute"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,1 L7,4 L0,7 Z" fill="#94a3b8" />
              </marker>
            </defs>

            {/* ── 1. WINDOWS ── */}
            <SectionLabel x={40} y={28} text="1  ·  SLIDING WINDOWS" color="#5eead4" />

            <path
              d="M 60 96 C 220 68, 380 124, 540 88 S 800 68, 940 106 S 1020 84, 1040 92"
              fill="none"
              stroke="url(#strandGrad)"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            {Array.from({ length: 20 }, (_, i) => {
              const t = i / 19;
              const x = 70 + t * 960;
              const y = 96 + Math.sin(t * Math.PI * 2.2) * 14;
              const fills = ["#2dd4bf", "#fb923c", "#38bdf8", "#fbbf24"];
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={5.5}
                  fill={fills[i % 4]}
                  opacity={0.9}
                />
              );
            })}

            <WindowBracket x={120} y={54} w={180} label="window i" />
            <WindowBracket x={400} y={54} w={180} label="window i+1" muted />
            <WindowBracket x={680} y={54} w={180} label="window k" />

            {/* windows → detector (centered on detector) */}
            <line
              x1={190}
              y1={124}
              x2={190}
              y2={198}
              stroke="#5eead4"
              strokeWidth="2"
              markerEnd="url(#arr)"
            />

            {/* ── 2 / 3. DETECTOR → GATE → CLASSIFIER ── */}
            <SectionLabel x={40} y={222} text="2  ·  DETECTOR" color="#2dd4bf" />
            <SectionLabel x={620} y={222} text="3  ·  CLASSIFIER" color="#38bdf8" />

            <Card x={40} y={240} w={280} h={150} accent="#2dd4bf">
              <text
                x={28}
                y={40}
                fill="#2dd4bf"
                fontSize="22"
                fontFamily="Manrope, sans-serif"
                fontWeight={700}
              >
                Detector
              </text>
              <text
                x={28}
                y={66}
                fill="rgba(232,240,236,0.5)"
                fontSize="13"
                fontFamily="JetBrains Mono, monospace"
              >
                TensorFlow · binary
              </text>
              <text
                x={28}
                y={102}
                fill="rgba(232,240,236,0.8)"
                fontSize="15"
                fontFamily="Manrope, sans-serif"
              >
                Is this window a riboswitch?
              </text>
              <Pill x={28} y={116} w={82} label="P(ribo)" fill="#2dd4bf" />
            </Card>

            {/* detector → gate */}
            <line
              x1={320}
              y1={315}
              x2={390}
              y2={315}
              stroke="#5eead4"
              strokeWidth="2"
              markerEnd="url(#arr)"
            />

            {/* Gate */}
            <g transform="translate(398, 267)">
              <path
                d="M 48 0 L 96 48 L 48 96 L 0 48 Z"
                fill="rgba(200,245,66,0.08)"
                stroke="#c8f542"
                strokeWidth="2"
              />
              <text
                x={48}
                y={44}
                textAnchor="middle"
                fill="#c8f542"
                fontSize="15"
                fontFamily="JetBrains Mono, monospace"
                fontWeight={700}
              >
                gate
              </text>
              <text
                x={48}
                y={64}
                textAnchor="middle"
                fill="rgba(200,245,66,0.65)"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                thresh
              </text>
            </g>

            {/* yes → classifier */}
            <line
              x1={494}
              y1={315}
              x2={580}
              y2={315}
              stroke="#5eead4"
              strokeWidth="2"
              markerEnd="url(#arr)"
            />
            <text
              x={534}
              y={302}
              textAnchor="middle"
              fill="#5eead4"
              fontSize="12"
              fontFamily="JetBrains Mono, monospace"
              fontWeight={600}
            >
              yes
            </text>

            {/*
              Reject is a TERMINAL — directly under the gate.
              Short down-arrow into the box. No leftward loop under the detector.
            */}
            <line
              x1={446}
              y1={363}
              x2={446}
              y2={412}
              stroke="#94a3b8"
              strokeWidth="2"
              markerEnd="url(#arrMute)"
            />
            <text
              x={462}
              y={392}
              fill="rgba(148,163,184,0.85)"
              fontSize="12"
              fontFamily="JetBrains Mono, monospace"
              fontWeight={600}
            >
              no
            </text>
            <g transform="translate(346, 420)">
              <rect
                width={200}
                height={52}
                rx={14}
                fill="rgba(100,116,139,0.12)"
                stroke="rgba(148,163,184,0.5)"
                strokeWidth="1.5"
              />
              <text
                x={100}
                y={22}
                textAnchor="middle"
                fill="rgba(203,213,225,0.95)"
                fontSize="14"
                fontFamily="Manrope, sans-serif"
                fontWeight={600}
              >
                reject window
              </text>
              <text
                x={100}
                y={40}
                textAnchor="middle"
                fill="rgba(148,163,184,0.75)"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                stop · no annotation
              </text>
            </g>

            {/* Classifier */}
            <Card x={580} y={240} w={460} h={150} accent="#38bdf8">
              <text
                x={28}
                y={36}
                fill="#38bdf8"
                fontSize="22"
                fontFamily="Manrope, sans-serif"
                fontWeight={700}
              >
                Classifier
              </text>
              <text
                x={28}
                y={60}
                fill="rgba(232,240,236,0.5)"
                fontSize="13"
                fontFamily="JetBrains Mono, monospace"
              >
                TensorFlow · 31 riboswitch families
              </text>
              <Pill x={340} y={20} w={92} label="P(family)" fill="#38bdf8" />

              {[
                { name: "TPP", w: 240, c: "#2dd4bf" },
                { name: "FMN", w: 170, c: "#38bdf8" },
                { name: "Purine", w: 130, c: "#f472b6" },
                { name: "SAM…", w: 80, c: "#fbbf24" },
              ].map((row, i) => (
                <g key={row.name} transform={`translate(28, ${76 + i * 17})`}>
                  <text
                    x={0}
                    y={11}
                    fill="rgba(232,240,236,0.5)"
                    fontSize="12"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {row.name}
                  </text>
                  <rect
                    x={72}
                    y={2}
                    width={300}
                    height={11}
                    rx={4}
                    fill="rgba(255,255,255,0.05)"
                  />
                  <rect
                    x={72}
                    y={2}
                    width={row.w}
                    height={11}
                    rx={4}
                    fill={row.c}
                    opacity={0.9}
                  />
                </g>
              ))}
            </Card>

            {/* classifier → output (same arrow style) */}
            <line
              x1={810}
              y1={390}
              x2={810}
              y2={500}
              stroke="#5eead4"
              strokeWidth="2"
              markerEnd="url(#arr)"
            />

            {/* ── 4. OUTPUT — no track line through tiles ── */}
            <SectionLabel
              x={40}
              y={520}
              text="4  ·  MULTI-HIT OUTPUT  ·  IoU NMS"
              color="#fbbf24"
            />

            <rect
              x={40}
              y={536}
              width={1000}
              height={100}
              rx={20}
              fill="rgba(4,12,14,0.96)"
              stroke="rgba(251,191,36,0.35)"
              strokeWidth="1.6"
            />

            <HitChip
              x={70}
              y={556}
              w={280}
              color="#2dd4bf"
              family="TPP riboswitch"
              meta="nt 1–190 · 100%"
            />
            <HitChip
              x={390}
              y={556}
              w={280}
              color="#f472b6"
              family="Purine riboswitch"
              meta="nt 376–485 · 100%"
            />
            <HitChip
              x={710}
              y={556}
              w={300}
              color="#a78bfa"
              family="FMN riboswitch"
              meta="nt 626–810 · 100%"
            />
          </svg>
        </div>

        <div className="grid gap-0 border-t border-white/8 sm:grid-cols-3">
          <Fact
            label="TensorFlow origin"
            body="Detector and classifier were trained in TensorFlow (Python). The app loads the ported weights locally."
          />
          <Fact
            label="Cascade gate"
            body="Only windows that clear the detector threshold continue. Rejects stop here — no family call."
          />
          <Fact
            label="Multi-hit NMS"
            body="Overlapping windows are merged with IoU non-max suppression so one strand can carry several families."
          />
        </div>
      </motion.div>
    </section>
  );
}

function SectionLabel({
  x,
  y,
  text,
  color,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fillOpacity={0.8}
      fontSize="12"
      fontFamily="JetBrains Mono, monospace"
      letterSpacing="2.5"
    >
      {text}
    </text>
  );
}

function Card({
  x,
  y,
  w,
  h,
  accent,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  children: ReactNode;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={w}
        height={h}
        rx={20}
        fill="rgba(4,12,14,0.96)"
        stroke={accent}
        strokeOpacity={0.4}
        strokeWidth={1.6}
      />
      <rect
        x={0}
        y={0}
        width={5}
        height={h}
        rx={2.5}
        fill={accent}
        opacity={0.85}
      />
      {children}
    </g>
  );
}

function Pill({
  x,
  y,
  w,
  label,
  fill,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  fill: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={w}
        height={26}
        rx={13}
        fill={`${fill}18`}
        stroke={fill}
        strokeOpacity={0.45}
      />
      <text
        x={w / 2}
        y={17}
        textAnchor="middle"
        fill={fill}
        fontSize="11"
        fontFamily="JetBrains Mono, monospace"
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

function WindowBracket({
  x,
  y,
  w,
  label,
  muted,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  muted?: boolean;
}) {
  const c = muted ? "rgba(148,163,184,0.4)" : "#5eead4";
  return (
    <g>
      <path
        d={`M ${x} ${y + 20} L ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + 20}`}
        fill="none"
        stroke={c}
        strokeWidth={muted ? 1.5 : 2}
      />
      {!muted && (
        <rect
          x={x}
          y={y + 22}
          width={w}
          height={48}
          fill="rgba(94,234,212,0.05)"
        />
      )}
      <text
        x={x + w / 2}
        y={y - 8}
        textAnchor="middle"
        fill={c}
        fontSize="12"
        fontFamily="JetBrains Mono, monospace"
      >
        {label}
      </text>
    </g>
  );
}

function HitChip({
  x,
  y,
  w,
  color,
  family,
  meta,
}: {
  x: number;
  y: number;
  w: number;
  color: string;
  family: string;
  meta: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={w}
        height={60}
        rx={14}
        fill={`${color}22`}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={1.5}
      />
      <text
        x={20}
        y={26}
        fill={color}
        fontSize="15"
        fontFamily="Manrope, sans-serif"
        fontWeight={700}
      >
        {family}
      </text>
      <text
        x={20}
        y={46}
        fill="rgba(232,240,236,0.5)"
        fontSize="12"
        fontFamily="JetBrains Mono, monospace"
      >
        {meta}
      </text>
    </g>
  );
}

function Fact({ label, body }: { label: string; body: string }) {
  return (
    <div className="border-white/8 px-6 py-5 sm:border-r sm:px-8 sm:last:border-r-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal-300/70">
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-dim)]">
        {body}
      </p>
    </div>
  );
}

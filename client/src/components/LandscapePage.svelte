<script lang="ts">
    import type { Snippet } from "svelte";

    let { children }: { children: Snippet } = $props();
</script>

<div id="rotate-overlay">
    <div class="stars"></div>

    <div class="message-box">
        <div class="tag">⚡ GATHER U ⚡</div>

        <div class="icon-container">
            <div class="device-icon-wrap">
                <svg class="device-svg" viewBox="0 0 48 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="44" height="68" rx="8" stroke="url(#device-stroke)" stroke-width="2.5" fill="#0b1120"/>
                    <rect x="7" y="10" width="34" height="48" rx="4" fill="#020617" stroke="rgba(0, 255, 255, 0.2)" stroke-width="1.5"/>
                    <line x1="19" y1="6" x2="29" y2="6" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="24" cy="63" r="2.5" fill="#38bdf8"/>
                    <path d="M12 34 L36 34" stroke="url(#line-glow)" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
                    <defs>
                        <linearGradient id="device-stroke" x1="0" y1="0" x2="48" y2="72" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#00ffff" />
                            <stop offset="1" stop-color="#8b5cf6" />
                        </linearGradient>
                        <linearGradient id="line-glow" x1="12" y1="34" x2="36" y2="34" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#06b6d4" />
                            <stop offset="1" stop-color="#8b5cf6" />
                        </linearGradient>
                    </defs>
                </svg>
                <div class="rotate-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.5 2v6h-6" />
                        <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19" />
                    </svg>
                </div>
            </div>
        </div>

        <h2>Rotate Device</h2>
        <p class="subtitle">LANDSCAPE MODE REQUIRED</p>

        <p class="desc">
            This world is crafted for widescreen exploration. Please rotate your device sideways to continue playing.
        </p>

        <div class="tip-badge">
            <span class="pulse-dot"></span>
            <span>Check that Auto-Rotate is unlocked</span>
        </div>
    </div>
</div>

<div id="app-content">
    {@render children()}
</div>

<style>
    #rotate-overlay {
        display: none;
    }

    #app-content {
        display: block;
    }

    @media screen and (orientation: portrait) {
        #app-content {
            display: none !important;
        }

        #rotate-overlay {
            display: flex;
            justify-content: center;
            align-items: center;
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(circle at top, #1e293b, #020617 70%);
            color: #ffffff;
            text-align: center;
            z-index: 99999;
            font-family: "Inter", system-ui, -apple-system, sans-serif;
            overflow: hidden;
            padding: 24px;
            box-sizing: border-box;
        }

        .stars {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(white 1px, transparent 1px);
            background-size: 45px 45px;
            opacity: 0.15;
            pointer-events: none;
        }

        .message-box {
            position: relative;
            width: 100%;
            max-width: 380px;
            padding: 36px 28px;
            border-radius: 24px;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(0, 255, 255, 0.3);
            box-shadow:
                0 0 50px rgba(0, 255, 255, 0.15),
                inset 0 0 30px rgba(139, 92, 246, 0.08);
            display: flex;
            flex-direction: column;
            align-items: center;
            animation: fadeIn 0.4s ease-out;
            box-sizing: border-box;
        }

        .tag {
            color: #00ffff;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 4px;
            text-transform: uppercase;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
            margin-bottom: 24px;
        }

        .icon-container {
            width: 110px;
            height: 110px;
            margin-bottom: 24px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, rgba(139, 92, 246, 0.05) 70%, transparent 100%);
            border: 1px solid rgba(0, 255, 255, 0.2);
            box-shadow: 0 0 25px rgba(0, 255, 255, 0.2);
            position: relative;
        }

        .device-icon-wrap {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: rotateDevice 3s ease-in-out infinite;
            transform-origin: center center;
        }

        .device-svg {
            width: 44px;
            height: 66px;
            filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.4));
        }

        .rotate-arrow {
            position: absolute;
            bottom: -6px;
            right: -10px;
            width: 22px;
            height: 22px;
            color: #38bdf8;
            filter: drop-shadow(0 0 6px #00ffff);
            animation: pulseGlow 1.5s ease-in-out infinite alternate;
        }

        .rotate-arrow svg {
            width: 100%;
            height: 100%;
        }

        h2 {
            margin: 0 0 6px 0;
            font-size: 24px;
            font-weight: 900;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            text-shadow: 0 0 12px rgba(0, 255, 255, 0.5);
        }

        .subtitle {
            color: #38bdf8;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 3px;
            margin-bottom: 14px;
            text-transform: uppercase;
        }

        .desc {
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.55;
            margin: 0 0 22px 0;
        }

        .tip-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(2, 6, 23, 0.7);
            border: 1px solid rgba(139, 92, 246, 0.35);
            border-radius: 9999px;
            font-size: 12px;
            color: #cbd5e1;
            font-weight: 500;
        }

        .pulse-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: #22c55e;
            box-shadow: 0 0 8px #22c55e;
            animation: pulse 1.8s infinite;
        }
    }

    @keyframes rotateDevice {
        0%, 15% {
            transform: rotate(0deg);
        }
        45%, 70% {
            transform: rotate(-90deg);
        }
        90%, 100% {
            transform: rotate(0deg);
        }
    }

    @keyframes pulseGlow {
        0% {
            opacity: 0.6;
            transform: scale(0.95);
        }
        100% {
            opacity: 1;
            transform: scale(1.1);
        }
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.4;
            transform: scale(0.85);
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: scale(0.96) translateY(10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
</style>

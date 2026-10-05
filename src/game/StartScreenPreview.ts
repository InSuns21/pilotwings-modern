import type { AircraftId, TaskId, WorldId } from './GameCatalog';

const SVG_OPEN =
  '<svg viewBox="0 0 320 176" role="img" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">';

export function worldPreviewSvg(id: WorldId): string {
  switch (id) {
    case 'training-island':
      return `${SVG_OPEN}
        <defs>
          <linearGradient id="world-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#8fcdf8"/>
            <stop offset="1" stop-color="#d9effd"/>
          </linearGradient>
          <linearGradient id="world-grass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#658a52"/>
            <stop offset="1" stop-color="#466b3e"/>
          </linearGradient>
        </defs>
        <rect width="320" height="176" rx="14" fill="url(#world-sky)"/>
        <path d="M0 88 L45 47 L78 78 L118 35 L168 91 L213 55 L265 91 L320 63 V176 H0Z" fill="#587449" opacity=".72"/>
        <path d="M0 108 C65 89 112 104 160 96 C214 87 259 102 320 91 V176 H0Z" fill="url(#world-grass)"/>
        <path d="M18 151 L294 105 L302 124 L26 170Z" fill="#363b42"/>
        <path d="M35 157 L285 116" stroke="#f5f1dc" stroke-width="3" stroke-dasharray="15 10"/>
        <path d="M218 121 L276 111 L280 119 L222 129Z" fill="#61d174" opacity=".8"/>
        <circle cx="102" cy="92" r="17" fill="none" stroke="#ff8a4c" stroke-width="5"/>
        <circle cx="149" cy="76" r="13" fill="none" stroke="#ffd34f" stroke-width="4" opacity=".9"/>
        <path d="M32 38 Q96 17 156 31" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".52"/>
      </svg>`;
  }
}

export function aircraftPreviewSvg(id: AircraftId): string {
  switch (id) {
    case 'trainer-01':
      return `${SVG_OPEN}
        <defs>
          <linearGradient id="aircraft-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#b8e1fb"/>
            <stop offset="1" stop-color="#eef8fd"/>
          </linearGradient>
          <linearGradient id="aircraft-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#fff4c9"/>
            <stop offset="1" stop-color="#f1d78d"/>
          </linearGradient>
        </defs>
        <rect width="320" height="176" rx="14" fill="url(#aircraft-sky)"/>
        <ellipse cx="160" cy="146" rx="104" ry="11" fill="#466b3e" opacity=".17"/>
        <g transform="translate(26 18)">
          <path d="M61 75 L177 69 Q206 69 229 82 L248 93 L229 104 Q202 114 171 110 L60 102 Q44 99 39 89 Q44 78 61 75Z" fill="url(#aircraft-body)" stroke="#c9a957" stroke-width="2"/>
          <path d="M119 74 L165 28 L184 31 L163 76Z" fill="#d94f3d" stroke="#a83b30" stroke-width="2"/>
          <path d="M118 101 L171 139 L190 134 L163 98Z" fill="#d94f3d" stroke="#a83b30" stroke-width="2"/>
          <path d="M72 76 L39 47 L29 51 L53 83Z" fill="#fff0bd" stroke="#c9a957" stroke-width="2"/>
          <path d="M70 101 L34 121 L25 115 L52 94Z" fill="#fff0bd" stroke="#c9a957" stroke-width="2"/>
          <path d="M61 75 L47 58 L42 83Z" fill="#d94f3d"/>
          <path d="M144 68 Q158 48 181 58 L198 72Z" fill="#315875" stroke="#253f53" stroke-width="2"/>
          <path d="M211 79 Q232 81 249 93 Q232 105 210 108Z" fill="#d94f3d"/>
          <circle cx="251" cy="93" r="8" fill="#b8bec4" stroke="#252c35" stroke-width="2"/>
          <path d="M257 62 V124 M228 93 H286" stroke="#252c35" stroke-width="5" stroke-linecap="round"/>
          <circle cx="119" cy="119" r="9" fill="#17191c"/>
          <circle cx="187" cy="122" r="9" fill="#17191c"/>
          <path d="M119 108 V119 M187 109 V122" stroke="#69717a" stroke-width="4"/>
          <circle cx="64" cy="72" r="3.5" fill="#ff4c42"/>
          <circle cx="170" cy="28" r="3.5" fill="#3acf68"/>
        </g>
        <text x="20" y="30" fill="#315875" font-size="12" font-weight="800" letter-spacing="2">TR-01</text>
      </svg>`;
  }
}

export function taskPreviewSvg(id: TaskId): string {
  switch (id) {
    case 'ring-training':
      return `${SVG_OPEN}
        <rect width="320" height="176" rx="14" fill="#dff2fc"/>
        <path d="M0 128 C82 105 154 119 320 87 V176 H0Z" fill="#5f874d"/>
        <path d="M20 153 L301 108 L307 126 L27 171Z" fill="#363b42"/>
        <path d="M38 157 L289 117" stroke="#f5f1dc" stroke-width="3" stroke-dasharray="14 10"/>
        <path d="M60 127 C96 70 132 55 166 73 C196 89 219 81 248 45" fill="none" stroke="#315875" stroke-width="4" stroke-dasharray="8 7" stroke-linecap="round"/>
        <g fill="none" stroke="#ff8a4c" stroke-width="6">
          <circle cx="101" cy="83" r="18"/>
          <circle cx="160" cy="68" r="16"/>
          <circle cx="219" cy="73" r="18"/>
        </g>
        <path d="M244 45 L253 49 L248 57" fill="none" stroke="#315875" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M220 120 L281 110 L286 120 L225 130Z" fill="#61d174" opacity=".9"/>
        <g transform="translate(45 111) rotate(-9)">
          <path d="M0 0 L27 -4 L39 1 L27 6 L0 4Z" fill="#fff0bd" stroke="#c9a957"/>
          <path d="M12 -2 L23 -14 L27 -13 L22 0Z" fill="#d94f3d"/>
        </g>
        <text x="20" y="28" fill="#315875" font-size="11" font-weight="800" letter-spacing="1.4">TAKEOFF → RINGS → LANDING</text>
      </svg>`;
  }
}

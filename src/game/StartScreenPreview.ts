import type { TaskId } from './GameCatalog';

const SVG_OPEN =
  '<svg viewBox="0 0 320 176" role="img" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">';

export function taskPreviewSvg(id: TaskId): string {
  switch (id) {
    case 'island-flight-basics':
      return `${SVG_OPEN}
        <rect width="320" height="176" rx="14" fill="#dff2fc"/>
        <path d="M0 132 C72 108 154 124 320 90 V176 H0Z" fill="#5f874d"/>
        <path d="M18 154 L302 111 L308 128 L24 171Z" fill="#363b42"/>
        <path d="M35 158 L292 119" stroke="#f5f1dc" stroke-width="3" stroke-dasharray="14 10"/>
        <path d="M52 128 C78 82 108 59 147 65 C195 71 215 39 245 54 C274 69 260 102 224 112 C184 123 135 105 109 123 C93 134 102 144 150 139" fill="none" stroke="#315875" stroke-width="4" stroke-dasharray="8 7" stroke-linecap="round"/>
        <g fill="none" stroke="#ff8a4c" stroke-width="5">
          <circle cx="78" cy="91" r="11"/>
          <circle cx="118" cy="67" r="10"/>
          <circle cx="161" cy="65" r="10"/>
          <circle cx="211" cy="51" r="10"/>
          <circle cx="255" cy="71" r="10"/>
          <circle cx="235" cy="107" r="10"/>
          <circle cx="185" cy="118" r="10"/>
          <circle cx="136" cy="130" r="10"/>
        </g>
        <path d="M146 139 L157 137 L151 147" fill="none" stroke="#315875" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M220 122 L281 113 L286 123 L225 132Z" fill="#61d174" opacity=".9"/>
        <text x="18" y="24" fill="#315875" font-size="10" font-weight="900" letter-spacing="1.1">CLIMB → LEVEL → BANK → DESCENT → FINAL</text>
        <text x="18" y="41" fill="#60736f" font-size="9" font-weight="700">8 RINGS · BASIC CONTROL CIRCUIT</text>
      </svg>`;

    case 'matsumoto-pattern-training':
      return `${SVG_OPEN}
        <rect width="320" height="176" rx="14" fill="#d7e5dc"/>
        <path d="M36 139 L278 44 L286 62 L44 157Z" fill="#555b60"/>
        <path d="M52 143 L272 55" stroke="#f8f4dd" stroke-width="3" stroke-dasharray="13 9"/>
        <path d="M92 125 C116 83 154 51 208 42 C254 35 283 55 276 83 C268 117 225 136 167 143 C127 148 96 141 92 125Z" fill="none" stroke="#315875" stroke-width="4" stroke-dasharray="8 7"/>
        <g fill="none" stroke="#ff8a4c" stroke-width="5">
          <circle cx="111" cy="104" r="10"/>
          <circle cx="147" cy="68" r="10"/>
          <circle cx="208" cy="43" r="10"/>
          <circle cx="262" cy="62" r="10"/>
          <circle cx="259" cy="105" r="10"/>
          <circle cx="207" cy="137" r="10"/>
          <circle cx="151" cy="143" r="10"/>
          <circle cx="106" cy="132" r="10"/>
        </g>
        <path d="M104 132 L118 131 L111 142" fill="none" stroke="#315875" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M142 108 L205 83 L211 94 L148 119Z" fill="#61d174" opacity=".9"/>
        <text x="18" y="24" fill="#315875" font-size="10" font-weight="900" letter-spacing="1.1">CLIMB → PATTERN → DESCENT → FINAL</text>
        <text x="18" y="41" fill="#60736f" font-size="9" font-weight="700">8 RINGS · MATSUMOTO AIRPORT PATTERN</text>
      </svg>`;
  }

  return assertNever(id);
}

function assertNever(value: never): never {
  throw new Error(`Unsupported task preview id: ${String(value)}`);
}

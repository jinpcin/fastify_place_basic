const ANSI_COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

type ANSIColor = keyof typeof ANSI_COLORS;

export function placeLog(message: string, color: ANSIColor | null = null) {
  customLog(message, "place", color);
}

export function commonLog(message: string, color: ANSIColor | null = null) {
  customLog(message, "공통", color);
}

export function customLog(message: string, type: string, color: ANSIColor | null) {
  const now = new Date();
  const timestamp = `${String(now.getFullYear()).slice(2)}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const colorCode = ANSI_COLORS[color ?? 'white']; // null 또는 undefined면 white로 대체
  const reset = ANSI_COLORS.reset;

  console.log(`${colorCode}[${timestamp}][${type}] ${message}${reset}`);
}

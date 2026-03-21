import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";

const FALLBACK_DASHBOARD_ICON: IconSvgElement = [
  [
    "path",
    {
      d: "M13.6903 19.4567C13.5 18.9973 13.5 18.4149 13.5 17.25C13.5 16.0851 13.5 15.5027 13.6903 15.0433C13.944 14.4307 14.4307 13.944 15.0433 13.6903C15.5027 13.5 16.0851 13.5 17.25 13.5C18.4149 13.5 18.9973 13.5 19.4567 13.6903C20.0693 13.944 20.556 14.4307 20.8097 15.0433C21 15.5027 21 16.0851 21 17.25C21 18.4149 21 18.9973 20.8097 19.4567C20.556 20.0693 20.0693 20.556 19.4567 20.8097C18.9973 21 18.4149 21 17.25 21C16.0851 21 15.5027 21 15.0433 20.8097C14.4307 20.556 13.944 20.0693 13.6903 19.4567Z",
      stroke: "currentColor",
      strokeLinecap: "square",
      strokeLinejoin: "round",
      strokeWidth: "1.5",
      key: "0"
    }
  ],
  [
    "path",
    {
      d: "M13.6903 8.95671C13.5 8.49728 13.5 7.91485 13.5 6.75C13.5 5.58515 13.5 5.00272 13.6903 4.54329C13.944 3.93072 14.4307 3.44404 15.0433 3.1903C15.5027 3 16.0851 3 17.25 3C18.4149 3 18.9973 3 19.4567 3.1903C20.0693 3.44404 20.556 3.93072 20.8097 4.54329C21 5.00272 21 5.58515 21 6.75C21 7.91485 21 8.49728 20.8097 8.95671C20.556 9.56928 20.0693 10.056 19.4567 10.3097C18.9973 10.5 18.4149 10.5 17.25 10.5C16.0851 10.5 15.5027 10.5 15.0433 10.3097C14.4307 10.056 13.944 9.56928 13.6903 8.95671Z",
      stroke: "currentColor",
      strokeLinecap: "square",
      strokeLinejoin: "round",
      strokeWidth: "1.5",
      key: "1"
    }
  ],
  [
    "path",
    {
      d: "M3.1903 19.4567C3 18.9973 3 18.4149 3 17.25C3 16.0851 3 15.5027 3.1903 15.0433C3.44404 14.4307 3.93072 13.944 4.54329 13.6903C5.00272 13.5 5.58515 13.5 6.75 13.5C7.91485 13.5 8.49728 13.5 8.95671 13.6903C9.56928 13.944 10.056 14.4307 10.3097 15.0433C10.5 15.5027 10.5 16.0851 10.5 17.25C10.5 18.4149 10.5 18.9973 10.3097 19.4567C10.056 20.0693 9.56928 20.556 8.95671 20.8097C8.49728 21 7.91485 21 6.75 21C5.58515 21 5.00272 21 4.54329 20.8097C3.93072 20.556 3.44404 20.0693 3.1903 19.4567Z",
      stroke: "currentColor",
      strokeLinecap: "square",
      strokeLinejoin: "round",
      strokeWidth: "1.5",
      key: "2"
    }
  ],
  [
    "path",
    {
      d: "M3.1903 8.95671C3 8.49728 3 7.91485 3 6.75C3 5.58515 3 5.00272 3.1903 4.54329C3.44404 3.93072 3.93072 3.44404 4.54329 3.1903C5.00272 3 5.58515 3 6.75 3C7.91485 3 8.49728 3 8.95671 3.1903C9.56928 3.44404 10.056 3.93072 10.3097 4.54329C10.5 5.00272 10.5 5.58515 10.5 6.75C10.5 7.91485 10.5 8.49728 10.3097 8.95671C10.056 9.56928 9.56928 10.056 8.95671 10.3097C8.49728 10.5 7.91485 10.5 6.75 10.5C5.58515 10.5 5.00272 10.5 4.54329 10.3097C3.93072 10.056 3.44404 9.56928 3.1903 8.95671Z",
      stroke: "currentColor",
      strokeLinecap: "square",
      strokeLinejoin: "round",
      strokeWidth: "1.5",
      key: "3"
    }
  ]
] as const;

const FALLBACK_SETTINGS_ICON: IconSvgElement = [
  [
    "path",
    {
      d: "M15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12Z",
      stroke: "currentColor",
      strokeWidth: "1.5",
      key: "0"
    }
  ],
  [
    "path",
    {
      d: "M21.011 14.0965C21.5329 13.9558 21.7939 13.8854 21.8969 13.7508C22 13.6163 22 13.3998 22 12.9669V11.0332C22 10.6003 22 10.3838 21.8969 10.2493C21.7938 10.1147 21.5329 10.0443 21.011 9.90358C19.0606 9.37759 17.8399 7.33851 18.3433 5.40087C18.4817 4.86799 18.5509 4.60156 18.4848 4.44529C18.4187 4.28902 18.2291 4.18134 17.8497 3.96596L16.125 2.98673C15.7528 2.77539 15.5667 2.66972 15.3997 2.69222C15.2326 2.71472 15.0442 2.90273 14.6672 3.27873C13.208 4.73448 10.7936 4.73442 9.33434 3.27864C8.95743 2.90263 8.76898 2.71463 8.60193 2.69212C8.43489 2.66962 8.24877 2.77529 7.87653 2.98663L6.15184 3.96587C5.77253 4.18123 5.58287 4.28891 5.51678 4.44515C5.45068 4.6014 5.51987 4.86787 5.65825 5.4008C6.16137 7.3385 4.93972 9.37763 2.98902 9.9036C2.46712 10.0443 2.20617 10.1147 2.10308 10.2492C2 10.3838 2 10.6003 2 11.0332V12.9669C2 13.3998 2 13.6163 2.10308 13.7508C2.20615 13.8854 2.46711 13.9558 2.98902 14.0965C4.9394 14.6225 6.16008 16.6616 5.65672 18.5992C5.51829 19.1321 5.44907 19.3985 5.51516 19.5548C5.58126 19.7111 5.77092 19.8188 6.15025 20.0341L7.87495 21.0134C8.24721 21.2247 8.43334 21.3304 8.6004 21.3079C8.76746 21.2854 8.95588 21.0973 9.33271 20.7213C10.7927 19.2644 13.2088 19.2643 14.6689 20.7212C15.0457 21.0973 15.2341 21.2853 15.4012 21.3078C15.5682 21.3303 15.7544 21.2246 16.1266 21.0133L17.8513 20.034C18.2307 19.8187 18.4204 19.711 18.4864 19.5547C18.5525 19.3984 18.4833 19.132 18.3448 18.5991C17.8412 16.6616 19.0609 14.6226 21.011 14.0965Z",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeWidth: "1.5",
      key: "1"
    }
  ]
] as const;

const DashboardSquare01Icon = FALLBACK_DASHBOARD_ICON;
const Settings02Icon = FALLBACK_SETTINGS_ICON;

function RobinIconGlyph({
  icon,
  size = 17,
  strokeWidth = 1.8,
  className
}: {
  icon?: IconSvgElement;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  if (!icon || !Array.isArray(icon)) {
    return null;
  }

  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    />
  );
}

export function IconSettings() {
  return <RobinIconGlyph icon={Settings02Icon} />;
}

export function IconSidebar() {
  return <RobinIconGlyph icon={DashboardSquare01Icon} size={16} />;
}

export function IconExpand() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M14 5H19V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 19H5V14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 5L13.5 10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19L10.5 13.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSend() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 12H18" />
      <path d="M12 6L18 12L12 18" />
    </svg>
  );
}

export function IconStop() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="8" height="8" rx="1.3" ry="1.3" />
    </svg>
  );
}

export function IconChevron() {
  return (
    <svg viewBox="0 0 12 8" aria-hidden="true" focusable="false">
      <path d="M1.5 1.5L6 6L10.5 1.5" />
    </svg>
  );
}

export function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5V19" />
      <path d="M5 12H19" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6L18 18" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function IconImage() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" ry="2.5" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="M20.5 15L15.5 11L11 15.5L9 13.8L3.5 18.4" />
    </svg>
  );
}

export function IconChat() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 12C20 16.4183 16.4183 20 12 20C10.8053 20 9.66834 19.7467 8.64478 19.2908L4 20L5.07146 16.1278C4.39443 14.9129 4 13.5028 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z" />
    </svg>
  );
}

export function IconTodo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <path d="M14 7H20" />
      <path d="M14 17H20" />
      <rect x="4" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconNote() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16" />
      <path d="M20 12V6C20 4.89543 19.1046 4 18 4H16" />
      <path d="M8 9H12" />
      <path d="M8 13H16" />
      <path d="M8 17H14" />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10H20" />
      <path d="M8 3V7" />
      <path d="M16 3V7" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 13L9 17L19 7" />
    </svg>
  );
}

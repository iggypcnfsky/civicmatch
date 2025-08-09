import React from "react";

type LogoProps = {
  className?: string;
};

export default function Logo({ className }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 404 404"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g clipPath="url(#clip0_9_680)">
        <path
          d="M101 202C101 257.781 146.219 303 202 303C202 358.781 156.781 404 101 404C45.2192 404 0 358.781 0 303C0 247.219 45.2192 202 101 202ZM303 202C358.781 202 404 247.219 404 303C404 358.781 358.781 404 303 404C247.219 404 202 358.781 202 303C257.781 303 303 257.781 303 202ZM202 101C202 156.781 247.219 202 303 202C247.219 202 202 247.219 202 303C202 247.655 157.485 202.707 102.306 202.008L101 202C156.781 202 202 156.781 202 101ZM101 0C156.781 0 202 45.2192 202 101C146.219 101 101 146.219 101 202C45.2192 202 0 156.781 0 101C0 45.2192 45.2192 0 101 0ZM303 0C358.781 0 404 45.2192 404 101C404 156.781 358.781 202 303 202C303 146.219 257.781 101 202 101C202 45.2192 247.219 0 303 0Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_9_680">
          <rect width="404" height="404" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}



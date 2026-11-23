export function LogoMark({ size = 32 }: { size?: number }) {
    return (
        <span className="bg-p grid shrink-0 place-items-center rounded-[9px]" style={{ width: size, height: size }} aria-hidden="true">
            <svg viewBox="0 0 32 20" width={size * 0.66} height={size * 0.41}>
                <path d="M1 19 9 3l5 9 5-9 5 9" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
                <path d="M19 19l6-12 6 12" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="3" strokeLinejoin="round" />
            </svg>
        </span>
    );
}

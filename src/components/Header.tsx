import { motion } from 'framer-motion'

const A = '/assets'

/**
 * The bar across the top. It is the one thing that survives every frame — only
 * the logo changes, because the lockup is drawn in black on the light card and
 * in white on the dark one.
 */
export function Header({ dark, onPage = false }: { dark: boolean; onPage?: boolean }) {
  return (
    <motion.header
      className="absolute left-0 top-0 z-40 flex h-[79px] w-full flex-col items-center justify-center px-[60px]"
      style={{
        background: onPage ? '#f9fafb' : undefined,
        borderBottom: onPage ? '1px solid #d6d9dc' : undefined,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex w-full items-center justify-between">
        <div className="relative" style={{ width: 95, height: 28.879 }}>
          <img
            src={`${A}/${dark ? 'atlysLogoWhite' : 'atlysLogo'}.svg`}
            alt="Atlys"
            className="absolute left-0 top-0 max-w-none"
            style={{ width: 65.506, height: 28.879 }}
          />
          <p
            className="absolute whitespace-pre text-[8.197px] font-semibold leading-[8.197px] tracking-[-0.1639px] text-brand"
            style={{ left: 61.39, top: 6.65 }}
          >
            {'visas on \ntime'}
          </p>
        </div>

        <span className="relative block size-[32px]">
          <img src={`${A}/avatarRing.svg`} alt="" aria-hidden className="absolute inset-0 size-full" />
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <img src={`${A}/avatar.png`} alt="" aria-hidden className="size-full object-cover" />
          </span>
        </span>
      </div>
    </motion.header>
  )
}

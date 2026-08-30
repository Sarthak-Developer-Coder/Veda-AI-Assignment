import { motion } from "motion/react";

function Star({ className, delay }: { className: string; delay: number }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className={className}
      animate={{ scale: [1, 1.18, 1], opacity: [0.75, 1, 0.75] }}
      transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeInOut" }}
    >
      <path
        d="M12 0c.6 6.2 5.2 11 11.4 12C17.2 13 12.6 17.8 12 24c-.6-6.2-5.2-11-11.4-12C6.8 11 11.4 6.2 12 0z"
        fill="currentColor"
      />
    </motion.svg>
  );
}

export function Extracting() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-[22px] bg-card px-4 shadow-card">
      <div className="flex flex-col items-center">
        <div className="relative h-[110px] w-[130px] text-brand">
          <Star className="absolute right-3 top-0 h-[70px] w-[70px]" delay={0} />
          <Star className="absolute bottom-1 left-2 h-[42px] w-[42px]" delay={0.35} />
          <Star className="absolute bottom-6 right-2 h-[20px] w-[20px] text-brand/70" delay={0.7} />
          <motion.span
            className="absolute left-1 top-6 h-2.5 w-2.5 rounded-full bg-brand/80"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <h2 className="mt-5 text-[26px] font-extrabold tracking-tight text-ink">Extracting...</h2>
        <p className="mt-1 text-[14px] text-muted-foreground">This may take a while</p>
      </div>
    </div>
  );
}

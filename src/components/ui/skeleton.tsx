import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

function Skeleton({
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn("animate-pulse rounded-none bg-white/10", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      {...props}
    />
  )
}

export { Skeleton }

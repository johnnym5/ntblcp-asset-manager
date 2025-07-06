'use client';

import { Button } from "@/components/ui/button";
import { Boxes } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.2,
        when: "beforeChildren",
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <motion.main
      className="flex min-h-screen flex-col items-center justify-center bg-background p-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex flex-col items-center space-y-6 text-center">
        <motion.div variants={itemVariants} className="rounded-full bg-primary p-4 text-primary-foreground">
          <Boxes className="h-12 w-12" />
        </motion.div>
        <motion.h1
          variants={itemVariants}
          className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
        >
          Welcome to NTBLCP Asset Manager
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="max-w-2xl text-lg text-muted-foreground"
        >
          A full-featured, offline-first web app to manage your assets efficiently.
        </motion.p>
        <motion.div variants={itemVariants}>
          <Button size="lg" asChild>
            <Link href="/assets">Start Managing Assets</Link>
          </Button>
        </motion.div>
      </div>
    </motion.main>
  );
}

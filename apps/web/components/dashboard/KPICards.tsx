'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Layers, Database, FileText, Cpu, MessageSquare } from 'lucide-react';
import { StatCard } from '../ui/stat-card';

interface KPICardsProps {
  metrics: {
    totalProjects: number;
    totalDocuments: number;
    totalChunks: number;
    totalEmbeddings: number;
    totalConversations: number;
  };
}

export function KPICards({ metrics }: KPICardsProps) {
  const cards = [
    {
      title: 'Total Projects',
      value: metrics.totalProjects,
      icon: Layers,
      description: 'Active workspaces',
    },
    {
      title: 'Uploaded Docs',
      value: metrics.totalDocuments,
      icon: Database,
      description: 'Ingested data assets',
    },
    {
      title: 'Parsed Chunks',
      value: metrics.totalChunks,
      icon: FileText,
      description: 'Extracted text blocks',
    },
    {
      title: 'Embeddings',
      value: metrics.totalEmbeddings,
      icon: Cpu,
      description: 'Vector-mapped chunks',
    },
    {
      title: 'Conversations',
      value: metrics.totalConversations,
      icon: MessageSquare,
      description: 'Active chat sessions',
    },
  ];

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 20 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-5 gap-4"
    >
      {cards.map((card, idx) => (
        <motion.div key={idx} variants={itemVariants}>
          <StatCard
            title={card.title}
            value={card.value}
            icon={card.icon}
            description={card.description}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

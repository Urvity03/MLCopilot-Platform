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
      trend: { value: '+12%', direction: 'up' as const },
      chartData: [1, 2, 2, Math.max(1, metrics.totalProjects - 1), metrics.totalProjects],
    },
    {
      title: 'Uploaded Docs',
      value: metrics.totalDocuments,
      icon: Database,
      description: 'Ingested data assets',
      trend: { value: '+24%', direction: 'up' as const },
      chartData: [0, Math.ceil(metrics.totalDocuments * 0.3), Math.ceil(metrics.totalDocuments * 0.6), metrics.totalDocuments],
    },
    {
      title: 'Parsed Chunks',
      value: metrics.totalChunks,
      icon: FileText,
      description: 'Extracted text blocks',
      trend: { value: '+18%', direction: 'up' as const },
      chartData: [0, Math.ceil(metrics.totalChunks * 0.2), Math.ceil(metrics.totalChunks * 0.7), metrics.totalChunks],
    },
    {
      title: 'Embeddings',
      value: metrics.totalEmbeddings,
      icon: Cpu,
      description: 'Vector-mapped chunks',
      trend: { value: '+18%', direction: 'up' as const },
      chartData: [0, Math.ceil(metrics.totalEmbeddings * 0.2), Math.ceil(metrics.totalEmbeddings * 0.7), metrics.totalEmbeddings],
    },
    {
      title: 'Conversations',
      value: metrics.totalConversations,
      icon: MessageSquare,
      description: 'Active chat sessions',
      trend: { value: '+5%', direction: 'up' as const },
      chartData: [0, Math.max(0, metrics.totalConversations - 2), Math.max(0, metrics.totalConversations - 1), metrics.totalConversations],
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
            trend={card.trend}
            chartData={card.chartData}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

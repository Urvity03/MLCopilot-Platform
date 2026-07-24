'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Layers, FileText, Cpu, MessageSquare } from 'lucide-react';
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
      title: 'Workspaces',
      value: metrics.totalProjects,
      icon: Layers,
      description: 'Active projects',
      accentColor: '#7C5CFC',
      chartData: [0, Math.max(1, metrics.totalProjects - 2), Math.max(1, metrics.totalProjects - 1), metrics.totalProjects],
    },
    {
      title: 'Documents',
      value: metrics.totalDocuments,
      icon: FileText,
      description: 'Ingested files',
      accentColor: '#4F8CFF',
      chartData: [0, Math.ceil(metrics.totalDocuments * 0.3), Math.ceil(metrics.totalDocuments * 0.6), metrics.totalDocuments],
    },
    {
      title: 'Embeddings',
      value: metrics.totalEmbeddings,
      icon: Cpu,
      description: 'Vector blocks',
      accentColor: '#3DD68C',
      chartData: [0, Math.ceil(metrics.totalEmbeddings * 0.2), Math.ceil(metrics.totalEmbeddings * 0.7), metrics.totalEmbeddings],
    },
    {
      title: 'Conversations',
      value: metrics.totalConversations,
      icon: MessageSquare,
      description: 'AI chat sessions',
      accentColor: '#F5B83D',
      chartData: [0, Math.max(0, metrics.totalConversations - 2), Math.max(0, metrics.totalConversations - 1), metrics.totalConversations],
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {cards.map((card, idx) => (
        <motion.div
          key={idx}
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } },
          }}
        >
          <StatCard
            title={card.title}
            value={card.value}
            icon={card.icon}
            description={card.description}
            accentColor={card.accentColor}
            chartData={card.chartData}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

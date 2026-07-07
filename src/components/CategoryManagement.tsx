import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trash } from 'lucide-react';
import { Category } from '../types';
import { dbService } from '../services/db';

interface CategoryManagementProps {
  categories: Category[];
}

export default function CategoryManagement({ categories }: CategoryManagementProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 p-6 md:p-8"
    >
      <h2 className="text-xl font-bold text-white">Gerenciar Categorias</h2>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nova categoria..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#d4af37]"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              dbService.addCategory(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>
      <div className="grid gap-2">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center justify-between bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <span className="text-white">{cat.name}</span>
            <button onClick={() => dbService.deleteCategory(cat.id)} className="text-red-500 hover:text-red-400">
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

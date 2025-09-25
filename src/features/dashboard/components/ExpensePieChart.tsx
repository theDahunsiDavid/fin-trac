import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { Transaction } from "../../transactions/types";

interface ExpensePieChartProps {
  transactions: Transaction[];
}

const COLORS = [
  "#86efac",
  "#93c5fd",
  "#fcd34d",
  "#fda4af",
  "#c4b5fd",
  "#67e8f9",
];

const VALID_CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Software Engineering",
  "Hygiene",
  "Health",
  "Car Fuel",
  "Other",
];

export const ExpensePieChart: React.FC<ExpensePieChartProps> = ({
  transactions,
}) => {
  const data = useMemo(() => {
    const expenses = transactions.filter(
      (t) => t.type === "debit" && VALID_CATEGORIES.includes(t.category),
    );
    const categoryTotals = expenses.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No expense data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value">
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
            }).format(value)
          }
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

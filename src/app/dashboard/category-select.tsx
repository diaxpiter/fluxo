"use client";

import { useState } from "react";
import { AddCategoryInline } from "@/app/dashboard/add-category-inline";
import { fieldClass } from "@/lib/ui";
import { categoryDisplayName } from "@/lib/dashboard-data";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Category } from "@/lib/types";

/**
 * A category <select> plus its inline "+ New category" creator. Newly created categories are
 * merged into the option list and auto-selected immediately -- no waiting on a page refresh, no
 * having to reopen the dropdown to find the category you just typed.
 */
export function CategorySelect({
  name = "categoryId",
  categories,
  defaultValue,
  categoryLabels,
  addCategoryT,
  common,
  className,
}: {
  name?: string;
  categories: Category[];
  defaultValue?: string | null;
  categoryLabels: Dictionary["categories"];
  addCategoryT: Dictionary["addCategory"];
  common: Dictionary["common"];
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [createdCategories, setCreatedCategories] = useState<Category[]>([]);

  const options = createdCategories.some((c) => !categories.some((existing) => existing.id === c.id))
    ? [...categories, ...createdCategories.filter((c) => !categories.some((existing) => existing.id === c.id))]
    : categories;

  return (
    <>
      <select
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={className ?? fieldClass}
      >
        <option value="">{common.uncategorized}</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {categoryDisplayName(c, categoryLabels)}
          </option>
        ))}
      </select>
      <AddCategoryInline
        t={addCategoryT}
        common={common}
        onCreated={(category) => {
          setCreatedCategories((prev) => [...prev, category]);
          setValue(category.id);
        }}
      />
    </>
  );
}

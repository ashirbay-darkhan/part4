'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, MoreHorizontal, Plus, Tag } from 'lucide-react';
import { ServiceCategory } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoriesListProps {
  categories: ServiceCategory[];
  isLoading: boolean;
  onEdit: (category: ServiceCategory) => void;
  onDelete: (category: ServiceCategory) => void;
  onCreateClick: () => void;
  serviceCountByCategory: Record<string, number>;
}

export function CategoriesList({
  categories,
  isLoading,
  onEdit,
  onDelete,
  onCreateClick,
  serviceCountByCategory,
}: CategoriesListProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className="shadow-sm text-center">
        <CardHeader>
          <CardTitle>No Categories Found</CardTitle>
          <CardDescription>
            Get started by creating your first service category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center my-8">
            <Tag className="w-20 h-20 text-muted-foreground" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onCreateClick} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Create Category</span>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {categories.map((category) => (
        <motion.div key={category.id} variants={item}>
          <Card className="shadow-sm overflow-hidden">
            <div 
              className="h-2" 
              style={{ backgroundColor: category.color || '#4f46e5' }} 
            />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle>{category.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(category)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Category
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(category)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Category
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Badge 
                  variant="secondary" 
                  className="font-normal"
                >
                  {serviceCountByCategory[category.id] || 0} services
                </Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => onEdit(category)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Category
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      ))}

      <motion.div variants={item}>
        <Card className="shadow-sm border-dashed h-full flex flex-col justify-center items-center p-6 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={onCreateClick}
        >
          <Plus className="h-10 w-10 mb-4 text-muted-foreground" />
          <p className="text-center text-muted-foreground">Create new category</p>
        </Card>
      </motion.div>
    </motion.div>
  );
} 
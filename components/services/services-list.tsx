'use client';

import { useMemo, useState } from 'react';
import {
  Clock,
  DollarSign,
  MoreHorizontal,
  Pencil,
  Trash2,
  ImageIcon,
  Search,
} from 'lucide-react';
import { Service } from '@/types';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ServicesListProps {
  services: Service[];
  isLoading: boolean;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

// Optimized file keys to prevent unnecessary re-renders
const getCardKey = (service: Service) => {
  // Create a stable key that only changes when the service actually changes
  return `service-${service.id}-${service.name.replace(/\s+/g, '-')}-${service.duration}-${service.price}`;
};

export function ServicesList({ services, isLoading, onEdit, onDelete }: ServicesListProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  
  // Use memoization to prevent unnecessary re-filtering and re-sorting
  const filteredAndSortedServices = useMemo(() => {
    // First filter the services - lowercase both sides for case-insensitive search
    const searchLower = search.toLowerCase();
    const filtered = services.filter(service => {
      const nameMatch = service.name.toLowerCase().includes(searchLower);
      const descMatch = service.description?.toLowerCase()?.includes(searchLower) || false;
      return nameMatch || descMatch;
    });
    
    // Then sort them
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'duration':
          return a.duration - b.duration;
        default:
          return 0;
      }
    });
  }, [services, search, sortBy]);

  // Memoized renderEmptyState to prevent recreation on each render
  const renderEmptyState = useMemo(() => {
    return (
      <EmptyState 
        hasServices={services.length > 0} 
        searchTerm={search}
        onClearSearch={() => setSearch('')}
      />
    );
  }, [services.length, search]);
  
  // Memoized renderServiceCard for consistency
  const renderServiceCards = useMemo(() => {
    return filteredAndSortedServices.map(service => (
      <ServiceCard 
        key={getCardKey(service)}
        service={service} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    ));
  }, [filteredAndSortedServices, onEdit, onDelete]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ServiceCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between">
        <div className="relative w-full sm:w-64">
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-3"
            aria-label="Search services"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="price-asc">Price (Low to High)</SelectItem>
              <SelectItem value="price-desc">Price (High to Low)</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredAndSortedServices.length === 0 ? renderEmptyState : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderServiceCards}
        </div>
      )}
    </div>
  );
}

// Separated components for better code organization and reusability

function ServiceCardSkeleton() {
  return (
    <Card className="animate-pulse overflow-hidden">
      <div className="h-48 bg-slate-200 dark:bg-slate-700 w-full"></div>
      <CardHeader className="pb-2">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
      </CardHeader>
      <CardContent>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-3"></div>
        <div className="flex justify-between mb-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-8"></div>
      </CardFooter>
    </Card>
  );
}

function EmptyState({ hasServices, searchTerm, onClearSearch }: { 
  hasServices: boolean, 
  searchTerm: string,
  onClearSearch: () => void 
}) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">🔍</div>
      <h3 className="text-lg font-medium mb-2">No services found</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        {hasServices
          ? "No services match your search criteria."
          : "You haven't added any services yet."}
      </p>
      {searchTerm && (
        <Button variant="outline" onClick={onClearSearch}>
          Clear Search
        </Button>
      )}
    </div>
  );
}

function ServiceCard({ service, onEdit, onDelete }: {
  service: Service,
  onEdit: (service: Service) => void,
  onDelete: (service: Service) => void
}) {
  return (
    <Card className="overflow-hidden">
      {service.imageUrl ? (
        <div className="w-full h-48 overflow-hidden">
          <img 
            src={service.imageUrl} 
            alt={service.name} 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <ImageIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{service.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Open menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(service)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={() => onDelete(service)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2 items-center mt-1">
          {service.category && (
            <Badge 
              variant="secondary" 
              className="text-xs font-normal"
            >
              {service.category}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 h-10">
          {service.description || 'No description provided'}
        </p>
        <div className="flex justify-between mt-4 text-sm">
          <div className="flex items-center">
            <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
            <span>{service.duration} min</span>
          </div>
          <div className="flex items-center font-medium">
            <DollarSign className="mr-1 h-4 w-4 text-muted-foreground" />
            <span>{service.price.toLocaleString()} ₸</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/50 pt-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs h-8"
          onClick={() => onEdit(service)}
        >
          <Pencil className="mr-2 h-3 w-3" />
          Edit Service
        </Button>
      </CardFooter>
    </Card>
  );
}
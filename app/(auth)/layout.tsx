import { ReactNode } from 'react';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative">
      {/* Decorative patterns inspired by Miyazaki designs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top left corner decoration */}
        <div className="absolute top-8 left-8 w-24 h-24 border-l-2 border-t-2 border-primary/30"></div>
        
        {/* Bottom right corner decoration */}
        <div className="absolute bottom-8 right-8 w-24 h-24 border-r-2 border-b-2 border-primary/30"></div>
      </div>
      
      {/* Content area */}
      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
      
      {/* Brand signature */}
      <div className="absolute bottom-4 text-center text-xs text-muted-foreground">
        <p>Booking Platform • {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
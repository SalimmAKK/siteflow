import React from 'react';

export const Logo: React.FC<{ className?: string; hideText?: boolean }> = ({ className = "h-8", hideText = false }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative h-full aspect-square rounded-[22%] bg-[#18181A] shrink-0">
        <span className="absolute bg-[#F2B705] rounded-[1px]" style={{ left: '27%', top: '30%', width: '46%', height: '11%' }} />
        <span className="absolute bg-[#F2B705] rounded-[1px]" style={{ left: '30%', top: '27%', width: '11%', height: '46%' }} />
      </div>
      {!hideText && (
        <span className="font-bold text-xl tracking-tight">
          SiteFlow
        </span>
      )}
    </div>
  );
};

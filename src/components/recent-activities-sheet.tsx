
'use client';
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Inbox, User, MapPin, Clock, X, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/lib/types';
import { Separator } from './ui/separator';
import { Badge } from '@/components/ui/badge';

interface RecentActivitiesSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onViewDetails: (asset: Asset) => void;
}

interface ActivityGroup {
  userName: string;
  userState: string;
  activities: Asset[];
}

export function RecentActivitiesSheet({ isOpen, onOpenChange, onViewDetails }: RecentActivitiesSheetProps) {
  const { assets, dismissedActivities, setDismissedActivities } = useAppState();

  const handleDismissAll = () => {
    const allActivityIds = assets.map(a => a.lastModified).filter(Boolean) as string[];
    setDismissedActivities(allActivityIds);
  };
  
  const handleClearDismissed = () => {
    setDismissedActivities([]);
  };

  const activityGroups: ActivityGroup[] = React.useMemo(() => {
    const groups: Record<string, ActivityGroup> = {};

    const sortedAssets = assets
      .filter(asset => asset.lastModified && asset.lastModifiedBy && !dismissedActivities.includes(asset.lastModified))
      .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime());

    sortedAssets.forEach(asset => {
      const userName = asset.lastModifiedBy!;
      if (!groups[userName]) {
        groups[userName] = {
          userName,
          userState: asset.lastModifiedByState || 'Unknown Location',
          activities: [],
        };
      }
      groups[userName].activities.push(asset);
    });

    return Object.values(groups).sort((a,b) => {
        const aDate = new Date(a.activities[0].lastModified!).getTime();
        const bDate = new Date(b.activities[0].lastModified!).getTime();
        return bDate - aDate;
    });

  }, [assets, dismissedActivities]);

  const totalActivities = activityGroups.reduce((acc, group) => acc + group.activities.length, 0);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Recent Activities</SheetTitle>
          <SheetDescription>
            Showing the most recently modified assets across the system, grouped by user.
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <ScrollArea className="flex-1">
          {totalActivities > 0 ? (
            <Accordion type="multiple" className="w-full p-6" defaultValue={activityGroups.map(g => g.userName)}>
              {activityGroups.map((group) => (
                <AccordionItem value={group.userName} key={group.userName}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-semibold">{group.userName}</span>
                      <span className="text-muted-foreground">({group.userState})</span>
                      <Badge variant="secondary">{group.activities.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2 pl-4 border-l">
                      {group.activities.map(asset => (
                         <Card key={asset.id} className="relative group">
                            <CardHeader className="pb-2">
                               <CardTitle className="text-base pr-8">{asset.description || 'Asset'}</CardTitle>
                               <CardDescription>{asset.category}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <div className="flex items-center gap-2">
                                   <Clock className="h-4 w-4" />
                                   <span>{formatDistanceToNow(new Date(asset.lastModified!), { addSuffix: true })}</span>
                                </div>
                            </CardContent>
                             <CardFooter>
                                <Button variant="secondary" size="sm" onClick={() => onViewDetails(asset)}>View Details</Button>
                            </CardFooter>
                         </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
              <CheckCheck className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold">All Caught Up</h3>
              <p className="text-sm">There are no new activities to show.</p>
            </div>
          )}
        </ScrollArea>
        <SheetFooter className="p-6 pt-4 border-t sm:justify-between">
           <Button variant="outline" onClick={handleClearDismissed} disabled={dismissedActivities.length === 0}>
             Show All Activities
           </Button>
           <SheetClose asChild>
             <Button>Close</Button>
           </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

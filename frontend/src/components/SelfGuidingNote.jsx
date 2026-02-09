
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lightbulb, Compass } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

export default function SelfGuidingNote({
    pageName,
    description,
    nextPageName,
    nextPagePath,
    nextPageGlimpse
}) {
    const navigate = useNavigate();

    return (
        <Card className="mt-12 bg-muted/20 border-dashed border-primary/20">
            <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-primary font-medium mb-1">
                        <Compass className="w-5 h-5" />
                        <span>Guide: {pageName}</span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {description}
                    </p>
                </div>

                <div className="flex flex-col gap-3 min-w-[280px] bg-background/50 p-4 rounded-lg border border-border/50">
                    <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                Up Next: {nextPageName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {nextPageGlimpse}
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={() => navigate(nextPagePath)}
                        className="w-full gap-2 group"
                        variant="default"
                    >
                        Go to {nextPageName}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

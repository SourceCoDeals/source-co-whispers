import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ActivityItem, activityConfig } from "@/lib/activityTypes";
import { TimeframeOption, getDateRange } from "./TimeframeFilter";

interface RecentActivityFeedProps {
  timeframe: TimeframeOption;
}

export function RecentActivityFeed({ timeframe }: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [timeframe]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const { start } = getDateRange(timeframe);
      const startDate = start?.toISOString();

      const queries = [];

      // Buyers query
      let buyersQuery = supabase
        .from("buyers")
        .select("id, pe_firm_name, created_at, tracker_id, industry_trackers(industry_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (startDate) buyersQuery = buyersQuery.gte("created_at", startDate);
      queries.push(buyersQuery);

      // Deals query
      let dealsQuery = supabase
        .from("deals")
        .select("id, deal_name, created_at, tracker_id, industry_trackers(industry_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (startDate) dealsQuery = dealsQuery.gte("created_at", startDate);
      queries.push(dealsQuery);

      // Scores query
      let scoresQuery = supabase
        .from("buyer_deal_scores")
        .select("id, scored_at, composite_score, interested, passed_on_deal, selected_for_outreach, buyers(pe_firm_name), deals(deal_name)")
        .order("scored_at", { ascending: false })
        .limit(10);
      if (startDate) scoresQuery = scoresQuery.gte("scored_at", startDate);
      queries.push(scoresQuery);

      // Transcripts query
      let transcriptsQuery = supabase
        .from("buyer_transcripts")
        .select("id, title, created_at, buyer_id, buyers(pe_firm_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (startDate) transcriptsQuery = transcriptsQuery.gte("created_at", startDate);
      queries.push(transcriptsQuery);

      // Learning history query
      let learningQuery = supabase
        .from("buyer_learning_history")
        .select("id, created_at, buyer_id, buyers(pe_firm_name), deals(deal_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (startDate) learningQuery = learningQuery.gte("created_at", startDate);
      queries.push(learningQuery);

      const [buyersResult, dealsResult, scoresResult, transcriptsResult, learningResult] = await Promise.all(queries);

      const allActivities: ActivityItem[] = [];

      // Process buyers
      (buyersResult.data || []).forEach((buyer: any) => {
        allActivities.push({
          id: `buyer-${buyer.id}`,
          type: "buyer_added",
          title: "New buyer added",
          description: `${buyer.pe_firm_name} added to ${buyer.industry_trackers?.industry_name || "universe"}`,
          timestamp: new Date(buyer.created_at),
          link: `/buyers/${buyer.id}`,
        });
      });

      // Process deals
      (dealsResult.data || []).forEach((deal: any) => {
        allActivities.push({
          id: `deal-${deal.id}`,
          type: "deal_created",
          title: "New deal created",
          description: `${deal.deal_name} in ${deal.industry_trackers?.industry_name || "universe"}`,
          timestamp: new Date(deal.created_at),
          link: `/deals/${deal.id}`,
        });
      });

      // Process scores
      (scoresResult.data || []).forEach((score: any) => {
        const buyerName = score.buyers?.pe_firm_name || "Buyer";
        const dealName = score.deals?.deal_name || "Deal";

        if (score.interested) {
          allActivities.push({
            id: `interested-${score.id}`,
            type: "buyer_interested",
            title: "Buyer interested",
            description: `${buyerName} interested in ${dealName}`,
            timestamp: new Date(score.scored_at),
          });
        } else if (score.passed_on_deal) {
          allActivities.push({
            id: `passed-${score.id}`,
            type: "buyer_passed",
            title: "Buyer passed",
            description: `${buyerName} passed on ${dealName}`,
            timestamp: new Date(score.scored_at),
          });
        } else if (score.selected_for_outreach) {
          allActivities.push({
            id: `outreach-${score.id}`,
            type: "outreach_approved",
            title: "Outreach approved",
            description: `${buyerName} approved for ${dealName}`,
            timestamp: new Date(score.scored_at),
          });
        } else if (score.composite_score) {
          allActivities.push({
            id: `scored-${score.id}`,
            type: "buyer_scored",
            title: "Buyer scored",
            description: `${buyerName} scored ${score.composite_score}% for ${dealName}`,
            timestamp: new Date(score.scored_at),
          });
        }
      });

      // Process transcripts
      (transcriptsResult.data || []).forEach((transcript: any) => {
        allActivities.push({
          id: `transcript-${transcript.id}`,
          type: "transcript_added",
          title: "Transcript added",
          description: `${transcript.title} for ${transcript.buyers?.pe_firm_name || "buyer"}`,
          timestamp: new Date(transcript.created_at),
          link: `/buyers/${transcript.buyer_id}`,
        });
      });

      // Process learning history
      (learningResult.data || []).forEach((learning: any) => {
        allActivities.push({
          id: `learning-${learning.id}`,
          type: "learning_captured",
          title: "Learning captured",
          description: `Rejection reason for ${learning.buyers?.pe_firm_name || "buyer"} on ${learning.deals?.deal_name || "deal"}`,
          timestamp: new Date(learning.created_at),
        });
      });

      // Sort by timestamp descending and take top 10
      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(allActivities.slice(0, 10));
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No activity in this timeframe.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const config = activityConfig[activity.type];
        const Icon = config.icon;

        const content = (
          <div className="flex items-start gap-3 text-sm group">
            <div className={`w-7 h-7 rounded-full ${config.bgClass} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-3.5 h-3.5 ${config.colorClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{activity.title}</p>
              <p className="text-muted-foreground truncate">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
        );

        if (activity.link) {
          return (
            <Link
              key={activity.id}
              to={activity.link}
              className="block hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors"
            >
              {content}
            </Link>
          );
        }

        return <div key={activity.id} className="py-1">{content}</div>;
      })}
    </div>
  );
}

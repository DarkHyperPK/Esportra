import { ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { TeamJourneyRecord } from '@/hooks/usePublicSeasons';

interface TeamJourneyProps {
  path: TeamJourneyRecord[];
  teamName?: string;
}

export default function TeamJourney({ path, teamName }: TeamJourneyProps) {
  if (path.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No journey data available for this team.</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'advanced':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'blocked':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'manual_override':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'advanced':
        return 'bg-green-100 text-green-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'manual_override':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">
        {teamName ? `${teamName}'s Journey` : 'Team Journey'}
      </h2>

      <div className="space-y-4">
        {path.map((record, index) => (
          <div key={record.id} className="relative">
            {/* Journey Step */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(record.status)}
                </div>

                {/* Content */}
                <div className="flex-1">
                  {/* From Tournament */}
                  {record.from_tournament_name && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">From</p>
                      <p className="font-semibold text-gray-900">{record.from_tournament_name}</p>
                      <p className="text-sm text-gray-600">Rank: #{record.source_rank}</p>
                    </div>
                  )}

                  {/* Arrow */}
                  {record.from_tournament_name && record.to_tournament_name && (
                    <div className="flex items-center gap-2 my-2 text-gray-400">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}

                  {/* To Tournament */}
                  {record.to_tournament_name && (
                    <div>
                      <p className="text-sm text-gray-600">To</p>
                      <p className="font-semibold text-gray-900">{record.to_tournament_name}</p>
                      <p className="text-sm text-gray-600">Seed: #{record.target_seed}</p>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="mt-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(record.status)}`}>
                      {record.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Advanced At */}
                  {record.advanced_at && (
                    <p className="text-sm text-gray-500 mt-2">
                      {formatDate(record.advanced_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Connector Line */}
            {index < path.length - 1 && (
              <div className="flex justify-center py-2">
                <div className="w-0.5 h-8 bg-gray-300" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

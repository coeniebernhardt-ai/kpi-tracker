'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAllProfiles, getAllTickets, getAllTravelLogs, type Profile, type Ticket, type TravelLog } from '../../lib/supabase';

type ImageLink = {
  type: 'profile' | 'ticket-attachment' | 'ticket-site-file' | 'travel-log';
  url: string;
  name: string;
  context: string;
};

export default function ImagesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [travelLogs, setTravelLogs] = useState<TravelLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAllProfiles(), getAllTickets(), getAllTravelLogs()])
      .then(([profilesData, ticketsData, travelLogsData]) => {
        if (cancelled) return;
        setProfiles(profilesData);
        setTickets(ticketsData);
        setTravelLogs(travelLogsData);
      })
      .catch(() => {
        if (cancelled) return;
        setProfiles([]);
        setTickets([]);
        setTravelLogs([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const imageLinks = useMemo(() => {
    const links: ImageLink[] = [];

    profiles.forEach((profile) => {
      if (profile.avatar_url) {
        links.push({
          type: 'profile',
          url: profile.avatar_url,
          name: `${profile.full_name} - Profile Picture`,
          context: `Profile: ${profile.full_name}`,
        });
      }
    });

    tickets.forEach((ticket) => {
      const memberProfile = profiles.find((profile) => profile.id === ticket.user_id);
      const ticketContext = `${ticket.ticket_number} - ${memberProfile?.full_name || 'Unknown'}`;

      ticket.attachments?.forEach((attachment) => {
        if (attachment.type?.startsWith('image/')) {
          links.push({
            type: 'ticket-attachment',
            url: attachment.url,
            name: attachment.name,
            context: `Ticket: ${ticketContext}`,
          });
        }
      });

      ticket.site_files?.forEach((file) => {
        if (file.type?.startsWith('image/')) {
          links.push({
            type: 'ticket-site-file',
            url: file.url,
            name: file.label || file.name,
            context: `Ticket: ${ticketContext}`,
          });
        }
      });

      ticket.updates?.forEach((update) => {
        update.attachments?.forEach((attachment) => {
          if (attachment.type?.startsWith('image/')) {
            links.push({
              type: 'ticket-attachment',
              url: attachment.url,
              name: attachment.name,
              context: `Ticket Update: ${ticketContext}`,
            });
          }
        });
      });
    });

    travelLogs.forEach((log) => {
      const memberProfile = profiles.find((profile) => profile.id === log.user_id);
      const logContext = `${memberProfile?.full_name || 'Unknown'} - ${log.reason}`;

      log.attachments?.forEach((attachment: { url: string; name: string; type: string }) => {
        if (attachment.type?.startsWith('image/')) {
          links.push({
            type: 'travel-log',
            url: attachment.url,
            name: attachment.name,
            context: `Travel Log: ${logContext}`,
          });
        }
      });
    });

    return links;
  }, [profiles, tickets, travelLogs]);

  const groupedLinks = useMemo(() => ({
    profile: imageLinks.filter((link) => link.type === 'profile'),
    ticketAttachments: imageLinks.filter((link) => link.type === 'ticket-attachment'),
    ticketSiteFiles: imageLinks.filter((link) => link.type === 'ticket-site-file'),
    travelLogs: imageLinks.filter((link) => link.type === 'travel-log'),
  }), [imageLinks]);

  const sections = [
    { key: 'profile', label: 'Profile Pictures', items: groupedLinks.profile },
    { key: 'ticket-attachment', label: 'Ticket Attachments', items: groupedLinks.ticketAttachments },
    { key: 'ticket-site-file', label: 'Ticket Site Files', items: groupedLinks.ticketSiteFiles },
    { key: 'travel-log', label: 'Travel Log Attachments', items: groupedLinks.travelLogs },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-white">Images</h1>
        <p className="mt-2 text-sm text-slate-400">
          Browse every profile, ticket, and travel-log image from a dedicated admin page.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Image Library</h2>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
            {imageLinks.length} total images
          </span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-10 text-center text-slate-400">
            Loading images...
          </div>
        ) : imageLinks.length === 0 ? (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-10 text-center text-slate-400">
            No images found.
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              section.items.length > 0 ? (
                <div key={section.key}>
                  <h3 className="mb-3 text-lg font-semibold text-white">
                    {section.label} ({section.items.length})
                  </h3>
                  <div className="space-y-2">
                    {section.items.map((link, index) => (
                      <div key={`${section.key}-${index}`} className="flex flex-col gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-slate-200">{link.name}</p>
                          <p className="truncate text-xs text-slate-500">{link.context}</p>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-1.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

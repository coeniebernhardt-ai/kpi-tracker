'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAdminData } from '../AdminDataProvider';
import { AdminPanel, EmptyState, SegmentedControl } from '../admin-ui';
import { type ImageTab } from '../admin-utils';

type MediaAsset = {
  id: string;
  tab: ImageTab;
  url: string;
  name: string;
  context: string;
  relatedLabel: string;
  relatedHref: string;
};

export default function ImagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
          Loading image library...
        </div>
      }
    >
      <ImagesPageContent />
    </Suspense>
  );
}

function ImagesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profiles, tickets, travelLogs, loading } = useAdminData();
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [copyState, setCopyState] = useState<string | null>(null);

  const activeTab: ImageTab = (searchParams.get('tab') as ImageTab | null) ?? 'profile';

  const updateParams = (updater: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    updater(next);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const assets = useMemo(() => {
    const items: MediaAsset[] = [];

    profiles.forEach((profile) => {
      if (!profile.avatar_url) return;
      items.push({
        id: `profile-${profile.id}`,
        tab: 'profile',
        url: profile.avatar_url,
        name: `${profile.full_name} profile`,
        context: profile.role,
        relatedLabel: profile.full_name,
        relatedHref: `/admin/team?member=${profile.id}`,
      });
    });

    tickets.forEach((ticket) => {
      ticket.attachments?.forEach((attachment, index) => {
        if (!attachment.type?.startsWith('image/')) return;
        items.push({
          id: `ticket-${ticket.id}-${index}`,
          tab: 'tickets',
          url: attachment.url,
          name: attachment.name,
          context: `${ticket.ticket_number} • ${ticket.client}`,
          relatedLabel: ticket.ticket_number,
          relatedHref: `/admin/tickets?tab=tickets&ticket=${ticket.id}`,
        });
      });

      ticket.site_files?.forEach((file, index) => {
        if (!file.type?.startsWith('image/')) return;
        items.push({
          id: `site-${ticket.id}-${index}`,
          tab: 'tickets',
          url: file.url,
          name: file.label || file.name,
          context: `${ticket.ticket_number} • Site file`,
          relatedLabel: ticket.ticket_number,
          relatedHref: `/admin/tickets?tab=tickets&ticket=${ticket.id}`,
        });
      });
    });

    travelLogs.forEach((log) => {
      log.attachments?.forEach((attachment, index) => {
        if (!attachment.type?.startsWith('image/')) return;
        items.push({
          id: `travel-${log.id}-${index}`,
          tab: 'travel-logs',
          url: attachment.url,
          name: attachment.name,
          context: log.reason,
          relatedLabel: 'Travel log',
          relatedHref: '/admin/tickets?tab=travel-logs',
        });
      });
    });

    return items;
  }, [profiles, tickets, travelLogs]);

  const filteredAssets = assets.filter((asset) => asset.tab === activeTab);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Images</h1>
        <p className="mt-2 text-sm text-slate-400">
          A full media hub for profile, ticket, and travel-log imagery with quick actions back into related records.
        </p>
      </section>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          value={activeTab}
          onChange={(value) => {
            updateParams((params) => {
              params.set('tab', value);
            });
          }}
          options={[
            { value: 'profile', label: 'Profile' },
            { value: 'tickets', label: 'Tickets' },
            { value: 'travel-logs', label: 'Travel Logs' },
          ]}
        />
      </div>

      <AdminPanel
        title="Media library"
        action={<span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">{filteredAssets.length} assets</span>}
      >
        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-slate-400">
            Loading image library...
          </div>
        ) : filteredAssets.length === 0 ? (
          <EmptyState title="No images found" description="This section will populate when image uploads exist for the selected category." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAsset(asset)}
                className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 text-left transition hover:border-blue-500/20"
              >
                <img src={asset.url} alt={asset.name} className="h-48 w-full object-cover" />
                <div className="p-4">
                  <p className="truncate text-sm font-medium text-white">{asset.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{asset.context}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </AdminPanel>

      {selectedAsset && (
        <div className="fixed inset-0 z-[70] overflow-hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedAsset(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedAsset.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedAsset.context}</p>
                </div>
                <button type="button" onClick={() => setSelectedAsset(null)} className="rounded-2xl bg-slate-800 px-3 py-2 text-sm text-slate-300">
                  Close
                </button>
              </div>

              <img src={selectedAsset.url} alt={selectedAsset.name} className="max-h-[65vh] w-full rounded-3xl object-contain" />

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={selectedAsset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl bg-blue-500/20 px-4 py-2.5 text-sm font-medium text-blue-300"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(selectedAsset.url);
                    setCopyState(selectedAsset.id);
                    setTimeout(() => setCopyState(null), 1500);
                  }}
                  className="rounded-2xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300"
                >
                  {copyState === selectedAsset.id ? 'Copied' : 'Copy link'}
                </button>
                <Link href={selectedAsset.relatedHref} className="rounded-2xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300">
                  View related item
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

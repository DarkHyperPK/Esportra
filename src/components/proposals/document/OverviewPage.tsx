import type { ReactNode } from 'react';
import type { Proposal } from '@/schemas/proposal';
import { Page } from './Page';
import { Panel } from './Panel';
import { Title } from './Title';
import { BODY } from './docStyles';

export interface OverviewPanel {
  title: string;
  body: ReactNode;
}

/** 01. Overview: who we are and what this is, in two short panels. */
export function OverviewPage({ doc, number, panels }: { doc: Proposal; number: string; panels: OverviewPanel[] }) {
  return (
    <Page anchor="about" number={number}>
      <Title doc={doc} number="01." text="Platform [overview]" />
      <div className="mt-12 grid gap-6 print:mt-10">
        {panels.map((panel) => (
          <Panel key={panel.title} title={panel.title}>
            <div className={`${BODY} text-base`}>{panel.body}</div>
          </Panel>
        ))}
      </div>
    </Page>
  );
}

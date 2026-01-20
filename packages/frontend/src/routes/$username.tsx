import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/$username')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/p/$username',
      params: { username: params.username },
      status: 301, // Permanent redirect for SEO
    });
  },
  component: () => null, // Never rendered due to redirect
});

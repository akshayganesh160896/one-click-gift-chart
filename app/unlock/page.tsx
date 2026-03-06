import UnlockForm from '@/components/unlock-form';

type UnlockPageProps = {
  searchParams?: {
    next?: string;
  };
};

export default function UnlockPage({ searchParams }: UnlockPageProps) {
  return <UnlockForm nextPath={searchParams?.next ?? '/dashboard'} />;
}

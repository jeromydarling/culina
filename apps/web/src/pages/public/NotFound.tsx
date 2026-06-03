import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-6 text-center">
      <div>
        <Logo />
        <h1 className="mt-8 font-heading text-6xl font-bold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">This page is still in the oven.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button>Back home</Button>
        </Link>
      </div>
    </div>
  );
}

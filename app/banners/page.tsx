import { redirect } from 'next/navigation';

export default function BannersRedirectPage() {
    redirect('/home-content#hero-banners');
}

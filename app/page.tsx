import {redirect} from 'next/navigation';
import Workspace from './workspace';
import {getCurrentUser} from './auth';
export const dynamic='force-dynamic';
export default async function Home(){if(!await getCurrentUser())redirect('/login');return <Workspace/>;}

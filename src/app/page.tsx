import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/login')
  // Anyone hitting the root URL gets sent to login
}

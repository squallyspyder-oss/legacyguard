import { AccountView, SignedOut } from '@neondatabase/auth-ui';
import { Link } from 'react-router-dom';
import './styles.css';

export default function AccountPage() {
  return (
    <main className="page">
      <section className="hero" style={{ maxWidth: 720 }}>
        <p className="eyebrow">Minha conta</p>
        <h1>Configurações e segurança</h1>
        <p className="lede">Gerencie credenciais, sessões, MFA e organizações fornecidas pelo Neon Auth.</p>
        <SignedOut>
          <p className="lede">
            Você precisa estar autenticado. <Link className="btn primary" to="/auth">Ir para login</Link>
          </p>
        </SignedOut>
        <AccountView view="SETTINGS" />
      </section>
    </main>
  );
}

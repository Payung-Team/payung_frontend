import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import {
  JOIN_LINK_PREVIEW,
  JOIN_GROUP_BY_LINK,
  MY_FAMILY_GROUPS,
  type JoinLinkPreview,
  type JoinLinkUnusableReason,
} from '../../graphql/familyGroup';
import { useStrings, type Strings } from './familyStrings';
import { FONT, GroupAvatar } from './components/familyUi';
import { fgErrorMessage } from './familyErrors';
import { setPendingJoinToken, joinPath } from './joinRedirect';

const GROUP_HOME = '/family-group';

/**
 * /join?token=… — the invite-acceptance flow (SCR-FG2, PYG-418).
 *
 * A public route: the main audience is someone who got the link in LINE and isn't signed
 * in yet. Signed out → we stash the token and send them to login/register, returning here
 * automatically. Signed in → preview the group (joinLinkPreview needs auth, so the group
 * name is only shown post-login by design), then joinGroupByLink on confirm.
 */
export default function JoinGroupPage() {
  const s = useStrings();
  const { session, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  if (authLoading) return <JoinShell><Checking s={s} /></JoinShell>;
  if (!token) {
    return (
      <JoinShell>
        <ErrorScreen s={s} title={s.errInvalidTitle} message={s.errAskOwner} />
      </JoinShell>
    );
  }
  if (!session) return <JoinShell><SignedOut token={token} s={s} /></JoinShell>;

  return (
    <JoinShell>
      <AuthedJoin token={token} />
    </JoinShell>
  );
}

// ── Signed-in flow ─────────────────────────────────────────────────────────────

function AuthedJoin({ token }: { token: string }) {
  const s = useStrings();
  const navigate = useNavigate();
  const [joined, setJoined] = useState<{ name: string } | null>(null);

  const { data, loading, error } = useQuery<{ joinLinkPreview: JoinLinkPreview }>(
    JOIN_LINK_PREVIEW,
    { variables: { token }, fetchPolicy: 'network-only' },
  );

  const [join, { loading: joining, error: joinError }] = useMutation<{
    joinGroupByLink: { id: string; name: string };
  }>(JOIN_GROUP_BY_LINK, { refetchQueries: [{ query: MY_FAMILY_GROUPS }] });

  if (loading) return <Checking s={s} />;

  // Only a token that matches no link throws; everything else comes back as data.
  if (error) {
    return <ErrorScreen s={s} title={s.errInvalidTitle} message={fgErrorMessage(error)} />;
  }

  const preview = data?.joinLinkPreview;
  if (!preview) {
    return <ErrorScreen s={s} title={s.errInvalidTitle} message={s.errAskOwner} />;
  }

  // Already a member → not an error; take them into the group.
  if (preview.alreadyMember) {
    return (
      <Centered
        iconWrap="bg-[#EFF6FF] text-[#1D4ED8]"
        icon="how_to_reg"
        title={s.joinAlreadyTitle}
        body={s.joinAlreadyBody(preview.groupName)}
      >
        <PrimaryButton onClick={() => navigate(GROUP_HOME, { replace: true })}>
          {s.goToGroup}
        </PrimaryButton>
      </Centered>
    );
  }

  // Unusable link → dedicated message per reason.
  if (!preview.isUsable) {
    const meta = unusableMeta(preview.unusableReason, s);
    return <ErrorScreen s={s} title={meta.title} message={s.errAskOwner} />;
  }

  if (joined) {
    return (
      <Centered
        iconWrap="bg-[#009265] text-white"
        icon="check"
        title={s.joinSuccessTitle}
        body={s.joinSuccessBody(joined.name)}
      >
        <PrimaryButton onClick={() => navigate(GROUP_HOME, { replace: true })}>
          {s.enterGroup}
        </PrimaryButton>
      </Centered>
    );
  }

  const handleJoin = async () => {
    try {
      const res = await join({ variables: { token } });
      setJoined({ name: res.data?.joinGroupByLink?.name || preview.groupName });
    } catch {
      // Link could have gone stale between preview and confirm — the joinError banner
      // below surfaces the server's message; no extra handling needed.
    }
  };

  // A usable link → the invite card.
  return (
    <div className="text-center">
      <GroupAvatar name={preview.groupName} seed={preview.groupName} size={80} className="mx-auto ring-[3px] ring-white shadow-[0_4px_16px_rgba(82,182,154,0.25)]" />
      <p className="mt-5 text-[13px] text-[#8A8C8E]">{s.joinInvitedTo}</p>
      <h1 className="mt-1 text-[24px] font-bold text-[#064E3B]">{preview.groupName}</h1>
      {preview.ownerName && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F6FAF9] px-3 py-1.5">
          <GroupAvatar name={preview.ownerName} seed={`owner-${preview.groupName}`} size={24} />
          <span className="text-[13px] text-[#1A1A1A]">{s.invitedBy(preview.ownerName)}</span>
        </div>
      )}
      <p className="mt-4 text-[13px] text-[#8A8C8E]">{s.memberCount(preview.memberCount)}</p>

      <ul className="mt-6 space-y-2.5 rounded-xl bg-[#F6FAF9] p-4 text-left">
        {[s.joinBenefits1, s.joinBenefits2].map((b) => (
          <li key={b} className="flex gap-2.5 text-[13px] text-[#1A1A1A]">
            <Icon name="check_circle" size="small" color="#52B69A" />
            {b}
          </li>
        ))}
        <li className="flex gap-2.5 text-[13px] text-[#8A8C8E]">
          <Icon name="info" size="small" className="text-gray-300" />
          {s.joinBenefits3}
        </li>
      </ul>

      {joinError && (
        <p className="mt-4 rounded-lg bg-[#FEF2F2] px-4 py-2.5 text-[13px] text-[#B42318]">
          {fgErrorMessage(joinError)}
        </p>
      )}

      <PrimaryButton className="mt-6" onClick={handleJoin} disabled={joining}>
        {joining ? s.busyJoining : s.joinCta}
      </PrimaryButton>
      <button
        type="button"
        onClick={() => navigate(GROUP_HOME, { replace: true })}
        className="mt-2 h-11 w-full rounded-lg text-[14px] font-medium text-[#8A8C8E] hover:bg-gray-50"
      >
        {s.joinLater}
      </button>
    </div>
  );
}

// ── Signed-out ───────────────────────────────────────────────────────────────

function SignedOut({ token, s }: { token: string; s: Strings }) {
  const navigate = useNavigate();
  const go = (target: '/login' | '/register') => {
    // Persist the token so both paths (login via ?redirect=, register via onboarding)
    // can return here automatically.
    setPendingJoinToken(token);
    const redirect = encodeURIComponent(joinPath(token));
    navigate(`${target}?redirect=${redirect}`);
  };
  return (
    <div className="text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F0FAF4]">
        <Icon name="groups" className="text-[#52B69A]" style={{ fontSize: 40 }} />
      </span>
      <h1 className="mt-5 text-[22px] font-bold text-[#064E3B]">{s.joinSignedOutTitle}</h1>
      <p className="mt-3 text-[14px] leading-6 text-gray-500">{s.joinSignedOutBody}</p>
      <PrimaryButton className="mt-6" onClick={() => go('/login')}>
        {s.signIn}
      </PrimaryButton>
      <button
        type="button"
        onClick={() => go('/register')}
        className="mt-2 h-12 w-full rounded-lg border border-gray-200 text-[15px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        {s.register}
      </button>
    </div>
  );
}

// ── Shared screens ─────────────────────────────────────────────────────────────

function Checking({ s }: { s: Strings }) {
  return (
    <div className="text-center">
      <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-gray-100" />
      <div className="mx-auto mt-5 h-5 w-52 animate-pulse rounded bg-gray-100" />
      <div className="mx-auto mt-3 h-4 w-64 animate-pulse rounded bg-gray-100" />
      <p className="mt-6 text-[13px] text-[#8A8C8E]">{s.joinChecking}</p>
    </div>
  );
}

function ErrorScreen({ s, title, message }: { s: Strings; title: string; message: string }) {
  const navigate = useNavigate();
  return (
    <Centered iconWrap="bg-[#FEF2F2] text-[#DC2626]" icon="link_off" title={title} body={message}>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="h-12 w-full rounded-lg border border-gray-200 text-[15px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        {s.backHome}
      </button>
    </Centered>
  );
}

function Centered({
  iconWrap,
  icon,
  title,
  body,
  children,
}: {
  iconWrap: string;
  icon: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="text-center">
      <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${iconWrap}`}>
        <Icon name={icon} size="large" style={{ fontSize: 38 }} />
      </div>
      <h1 className="mt-5 text-[22px] font-bold text-[#064E3B]">{title}</h1>
      <p className="mt-2 text-[14px] leading-6 text-gray-500">{body}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-12 w-full rounded-lg bg-[#009265] text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-colors hover:bg-[#007C55] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

function JoinShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[#F6FAF9] px-4 py-8"
      style={{ fontFamily: FONT }}
    >
      <div className="mx-auto max-w-[480px] text-center">
        <span className="text-[22px] font-bold tracking-tight text-[#005C3E]">payung</span>
      </div>
      <div className="mx-auto mt-8 w-full max-w-[480px] rounded-2xl border border-gray-100 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        {children}
      </div>
    </div>
  );
}

function unusableMeta(
  reason: JoinLinkUnusableReason | null | undefined,
  s: Strings,
): { title: string } {
  switch (reason) {
    case 'EXPIRED':
      return { title: s.errExpiredTitle };
    case 'REVOKED':
      return { title: s.errRevokedTitle };
    case 'EXHAUSTED':
      return { title: s.errExhaustedTitle };
    case 'GROUP_FULL':
      return { title: s.errFullTitle };
    default:
      return { title: s.errInvalidTitle };
  }
}

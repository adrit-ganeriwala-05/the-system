import { requireOnboardedUserId, requireUser } from "@/lib/session";
import Divider from "@/components/system/Divider";
import TrackSettings from "@/components/TrackSettings";
import ProfileSettings from "@/components/ProfileSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireOnboardedUserId();
  const user = await requireUser();

  return (
    <div className="px-5 pb-8 pt-6 sm:px-7">
      <div className="boot-section" style={{ ["--i" as string]: 0 }}>
        <Divider label="account" right={user.email} />
        <p className="mt-3 text-sm ink-2">
          Track changes take effect on tomorrow&rsquo;s quest. Today&rsquo;s targets and your
          streak history are never rewritten.
        </p>
      </div>
      <div className="boot-section mt-7" style={{ ["--i" as string]: 1 }}>
        <ProfileSettings name={user.name} />
      </div>
      <div className="boot-section mt-7" style={{ ["--i" as string]: 2 }}>
        <TrackSettings
          track={user.commitmentTrack}
          customNewTarget={user.customNewTarget}
          customReviewTarget={user.customReviewTarget}
          customFreezesPerMonth={user.customFreezesPerMonth}
          freezesRemaining={user.streakFreezesRemaining}
        />
      </div>
    </div>
  );
}

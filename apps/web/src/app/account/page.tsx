import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { getMemberState } from "@/server/community/members";
import { getAvatarUrl, getBike } from "@/server/community/profile";
import { getSql } from "@/server/db/client";
import { ImagePicker } from "@/features/media/ImagePicker";
import { Avatar } from "@/ui/Avatar/Avatar";
import { saveBikeAction, setAvatarAction, signOutAction, signOutEverywhereAction, updateNameAction, updatePrivacyAction } from "./actions";
import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";

export const instant = false;
export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const user = await requireUser("/account");
  const sp = await searchParams;
  const sql = getSql();
  const [member, avatarUrl, bike] = await Promise.all([getMemberState(sql, user.id), getAvatarUrl(sql, user.id), getBike(sql, user.id)]);
  return (
    <section className="flex flex-col gap-10 py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight">Account</h1>
      <div>
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-mono">{user.email}</p>
      </div>
      <form action={updateNameAction} className="flex max-w-md flex-col gap-3">
        <label htmlFor="name" className="text-sm font-medium">Display name</label>
        <input id="name" name="name" defaultValue={user.displayName} minLength={2} maxLength={40} required className="min-h-12 rounded-lg border border-foreground/40 bg-background px-3" />
        <p className="text-sm text-muted">Shown with trails you contribute.</p>
        {sp.saved ? <p role="status" className="text-sm font-medium text-status-good">Saved.</p> : null}
        {sp.error ? <p role="status" className="text-sm font-medium text-status-stop">Use 2 to 40 characters.</p> : null}
        <SubmitButton className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Save name</SubmitButton>
      </form>
      <form action={setAvatarAction} className="flex max-w-md flex-col gap-3">
        <div className="flex items-center gap-4">
          <Avatar name={user.displayName} url={avatarUrl} size={72} />
          <h2 className="text-xl font-semibold">Profile picture</h2>
        </div>
        <ImagePicker name="mediaId" label="Choose a picture" hint="Shown next to your name in your clubs. JPEG, PNG, WebP or AVIF, up to 10 MB." />
        {sp.avatar === "saved" ? <p role="status" className="text-sm font-medium text-status-good">Saved.</p> : null}
        {sp.avatar === "error" ? <p role="status" className="text-sm font-medium text-status-stop">Choose a picture and wait for it to finish uploading.</p> : null}
        <div className="flex flex-wrap gap-3">
          <SubmitButton className="min-h-12 rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Save picture</SubmitButton>
          {avatarUrl ? <SubmitButton name="remove" value="1" className="min-h-12 rounded-lg border border-foreground px-5 text-sm font-medium">Remove picture</SubmitButton> : null}
        </div>
      </form>
      <form action={saveBikeAction} className="flex max-w-md flex-col gap-3">
        <h2 className="text-xl font-semibold">Your bike</h2>
        <p className="text-sm text-muted">Shown to the members of your clubs, and no one else.</p>
        <label htmlFor="bike-name" className="text-sm font-medium">Bike name</label>
        <input id="bike-name" name="name" defaultValue={bike?.name ?? ""} minLength={2} maxLength={60} required className="min-h-12 rounded-lg border border-foreground/40 bg-background px-3" />
        <label htmlFor="bike-year" className="text-sm font-medium">Model year <span className="text-muted">(optional)</span></label>
        <input id="bike-year" name="modelYear" type="number" inputMode="numeric" min={1900} max={2100} defaultValue={bike?.modelYear ?? ""} className="min-h-12 rounded-lg border border-foreground/40 bg-background px-3" />
        {bike?.photoUrl ? (
          <div className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bike.photoUrl} alt="Your bike" className="h-28 w-auto max-w-full self-start rounded-2xl object-cover" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removePhoto" /> Remove this photo</label>
          </div>
        ) : null}
        <ImagePicker name="photoMediaId" label={bike?.photoUrl ? "Replace the photo" : "Bike photo"} />
        {sp.bike === "saved" ? <p role="status" className="text-sm font-medium text-status-good">Saved.</p> : null}
        {sp.bike === "error" ? <p role="status" className="text-sm font-medium text-status-stop">Give the bike a name of 2 to 60 characters and a year between 1900 and 2100, or leave the year blank.</p> : null}
        <div className="flex flex-wrap gap-3">
          <SubmitButton className="min-h-12 rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Save bike</SubmitButton>
          {bike ? <SubmitButton name="remove" value="1" className="min-h-12 rounded-lg border border-foreground px-5 text-sm font-medium">Remove bike</SubmitButton> : null}
        </div>
      </form>
      <form action={updatePrivacyAction} className="flex max-w-md flex-col gap-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Rider list</legend>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="visibility" value="public" defaultChecked={member?.profilePublic === true} className="mt-1" /> Show me on trails I have ridden, and let riders ask me questions</label>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="visibility" value="private" defaultChecked={member?.profilePublic !== true} className="mt-1" /> Keep me private (I still count in the total)</label>
        </fieldset>
        <label htmlFor="bio" className="text-sm font-medium">About you <span className="text-muted">(shown on your rider page if you are public)</span></label>
        <textarea id="bio" name="bio" rows={3} maxLength={300} defaultValue={member?.bio ?? ""} className="w-full rounded-lg border border-foreground/40 bg-background px-3 py-2" />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="isWoman" defaultChecked={member?.isWoman === true} className="mt-1" /> I ride as a woman (only used to join women-only clubs; never shown)</label>
        <p className="text-sm text-muted">Comments always show your display name, whatever you choose here.</p>
        {sp.privacy === "saved" ? <p role="status" className="text-sm font-medium text-status-good">Saved.</p> : null}
        {sp.privacy === "error" ? <p role="status" className="text-sm font-medium text-status-stop">We could not save that.</p> : null}
        <SubmitButton className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Save privacy</SubmitButton>
      </form>
      <p><Link href="/account/contributions" className="underline underline-offset-4">Your contributions</Link></p>
      <p><Link href="/account/questions" className="underline underline-offset-4">Your questions</Link></p>
      <p><Link href="/account/devices" className="underline underline-offset-4">Connected devices</Link></p>
      <div className="flex flex-wrap gap-4">
        <form action={signOutAction}>
          <SubmitButton className="min-h-12 rounded-lg border border-foreground px-5 text-sm font-medium">Sign out</SubmitButton>
        </form>
        <form action={signOutEverywhereAction}>
          <SubmitButton className="min-h-12 rounded-lg border border-foreground px-5 text-sm font-medium">Sign out on all devices</SubmitButton>
        </form>
      </div>
    </section>
  );
}

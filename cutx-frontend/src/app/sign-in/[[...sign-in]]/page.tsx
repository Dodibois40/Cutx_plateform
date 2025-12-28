import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A09]">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#121110] border border-[#2A2826]",
          }
        }}
      />
    </div>
  );
}

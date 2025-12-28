import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A09]">
      <SignUp
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

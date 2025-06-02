"use client"
import FileUpload from '../components/FileUpload';
import { useSession, signIn, signOut } from 'next-auth/react'

export default function HomePage() {
  const { data: session, status } = useSession()

  const handleUploadComplete = (files: any[]) => {
    console.log('Upload completed:', files);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    alert(`Upload error: ${error}`);
  };

  return (
    <div className="bg-white container w-full h-full mx-auto px-4 py-8 max-w-4xl">
      {/* Authentication Section */}
      {status === "loading" ? (
        <p>Loading...</p>
      ) : session?.user? (
        <>
          <p>Signed in as {session.user.email}</p>
          <button
            onClick={() => signOut()}
            className="bg-red-500 text-white px-4 py-2 rounded mb-4"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <p>Not signed in</p>
          <button
            onClick={() => signIn()}
            className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
          >
            Sign in
          </button>
        </>
      )}

      {/* Upload Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Real Estate Document Manager
        </h1>
        <p className="text-gray-600">
          Upload and manage your real estate documents securely
        </p>
      </div>

      <FileUpload
        maxFileSize={15 * 1024 * 1024} // 15MB
        allowedTypes={['application/pdf', 'image/jpeg', 'image/png']}
        maxFiles={5}
        uploadEndpoint="/api/documents/upload"
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        title="Upload Real Estate Documents"
        description="Supports PDF, JPG, PNG files"
        className="mb-8"
      />
    </div>
  );
}

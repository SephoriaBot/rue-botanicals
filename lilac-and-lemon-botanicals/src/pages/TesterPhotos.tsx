import { Link, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react-router';
import { useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';

type TesterPhoto = {
  id: number;
  photo_type: 'baseline' | 'progress';
  image_url: string;
  uploaded_at: string;
};

export default function TesterPhotos() {
  const { isLoaded, isSignedIn, user } = useUser();

  const [photos, setPhotos] = useState<TesterPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSignedIn || !user) {
      setLoading(false);
      return;
    }

    async function loadPhotos() {
      try {
        const res = await fetch(
          `/api/tester-photos?userId=${encodeURIComponent(user.id)}`
        );

        if (!res.ok) {
          throw new Error('Failed to load photos');
        }

        const data = await res.json();
        setPhotos(data.photos ?? []);
      } catch (err) {
        console.error('Could not load tester photos:', err);
        setError('Could not load your photos.');
      } finally {
        setLoading(false);
      }
    }

    loadPhotos();
  }, [isSignedIn, user]);

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    photoType: 'baseline' | 'progress'
  ) {
    const file = event.target.files?.[0];

    if (!file || !user) return;

    setUploading(true);
    setError('');

    try {
      const blob = await upload(
        `tester-photos/${user.id}-${Date.now()}-${file.name}`,
        file,
        {
          access: 'public',
          handleUploadUrl: '/api/tester-photo-upload',
          clientPayload: JSON.stringify({
            userId: user.id,
          }),
        }
      );

      const saveRes = await fetch('/api/tester-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          photoType,
          imageUrl: blob.url,
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to save photo record');
      }

      const refreshRes = await fetch(
        `/api/tester-photos?userId=${encodeURIComponent(user.id)}`
      );

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setPhotos(data.photos ?? []);
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      setError('Could not upload that photo. Please try again.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  const baselinePhotos = photos.filter(
    (photo) => photo.photo_type === 'baseline'
  );

  const progressPhotos = photos.filter(
    (photo) => photo.photo_type === 'progress'
  );

  return (
    <main className="tester-page">
      <section className="tester-hero wrap">
        <div className="tester-eyebrow">
          RUE BOTANICALS · TESTER PORTAL
        </div>

        <h1>Your testing photos.</h1>

        <p>
          Take clear, consistent photos throughout your test so you can
          compare how your skin changes over time.
        </p>
      </section>

      <section className="tester-content wrap">
        <div className="tester-section-heading">
          <div>
            <span className="tester-kicker">STARTING PHOTOS</span>
            <h2>Baseline</h2>
          </div>
        </div>

        <p>
          Take your baseline photos before beginning your testing routine.
        </p>

        <label className="tester-task-action">
          {uploading ? 'Uploading…' : 'Add baseline photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            hidden
            disabled={uploading}
            onChange={(event) =>
              handleUpload(event, 'baseline')
            }
          />
        </label>

        {baselinePhotos.length > 0 && (
          <div className="tester-photo-grid">
            {baselinePhotos.map((photo) => (
              <img
                key={photo.id}
                src={photo.image_url}
                alt="Baseline"
                className="tester-photo"
              />
            ))}
          </div>
        )}
      </section>

      <section className="tester-content wrap">
        <div className="tester-section-heading">
          <div>
            <span className="tester-kicker">PROGRESS PHOTOS</span>
            <h2>Keep documenting</h2>
          </div>
        </div>

        <p>
          Add progress photos as you continue testing.
        </p>

        <label className="tester-task-action">
          {uploading ? 'Uploading…' : 'Add progress photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            hidden
            disabled={uploading}
            onChange={(event) =>
              handleUpload(event, 'progress')
            }
          />
        </label>

        {progressPhotos.length > 0 && (
          <div className="tester-photo-grid">
            {progressPhotos.map((photo) => (
              <img
                key={photo.id}
                src={photo.image_url}
                alt="Progress"
                className="tester-photo"
              />
            ))}
          </div>
        )}
      </section>

      {error && (
        <section className="tester-note wrap">
          <div>
            <h3>Something went wrong</h3>
            <p>{error}</p>
          </div>
        </section>
      )}

      <section className="tester-content wrap">
        <Link to="/tester">← Back to dashboard</Link>
      </section>
    </main>
  );
}
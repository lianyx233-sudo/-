import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../components/AuthContext';
import { db } from '../lib/tcb';
import { collection, query, where, getDocs, deleteDoc, doc } from '../lib/tcb';

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchFavorites = async () => {
      try {
        const q = query(
          collection(db, 'favorites'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        fetched.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFavorites(fetched);
      } catch (err) {
        console.error('Error fetching favorites:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const removeFavorite = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'favorites', id));
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="min-h-screen pt-32 pb-16 px-12 bg-[#F7F7F5] flex items-center justify-center"><div className="w-4 h-4 bg-black animate-ping" /></div>;
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-32 pb-16 px-12 bg-[#F7F7F5] text-black"
    >
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-light mb-12">收藏夹</h1>
        
        {favorites.length === 0 ? (
          <div className="text-black/40 font-light">暂无收藏。去点亮坊看看吧。</div>
        ) : (
          <div className="space-y-6">
            {favorites.map(fav => (
              <div key={fav.id} className="border border-black/10 bg-white p-8 flex justify-between items-start group">
                <div>
                  <h3 className="text-xl font-light mb-4">{fav.title}</h3>
                  <div className="flex gap-4 text-xs tracking-widest text-black/50 font-medium">
                    {fav.category && <span className="uppercase border border-black/10 px-2 leading-relaxed">{fav.category}</span>}
                    {fav.readTime && <span className="uppercase truncate border border-black/10 px-2 leading-relaxed">{fav.readTime}</span>}
                    {fav.author && <span>{fav.author}</span>}
                  </div>
                </div>
                <button 
                  onClick={() => removeFavorite(fav.id)}
                  className="text-xs uppercase tracking-widest text-red-500/50 hover:text-red-500 transition-colors"
                >
                  取消收藏
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.main>
  );
}

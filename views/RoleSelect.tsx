import React from 'react';
import { User } from '../types';
import avatarGirl3d from '../assets/icons/3d/avatar_girl_3d.png';
import bookStack3d from '../assets/icons/3d/book_stack_3d.png';
import quizBoard3d from '../assets/icons/3d/quiz_board_3d.png';

interface RoleSelectProps {
    user: User;
    familyChildren: User[];
    onSelectChild: (child: User) => void;
    onRequestParentView: () => void;
    onSignOut: () => void;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({
    user,
    familyChildren,
    onSelectChild,
    onRequestParentView,
    onSignOut
}) => {
    return (
        <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center p-6 relative overflow-hidden font-display">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/20 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px]"></div>

            <div className="relative z-10 mb-12 text-center">
                <div className="w-32 h-32 mx-auto mb-6 animate-float">
                    <img src={bookStack3d} alt="Logo" className="w-full h-full object-contain drop-shadow-2xl" />
                </div>
                <h1 className="text-5xl font-black text-brand-textDark mb-3 tracking-tight">StudyQuest</h1>
                <p className="text-xl text-brand-textLight font-bold">欢迎回来，{user.name} 👋</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 relative z-10 items-stretch">
                {user.role === 'parent' && (
                    <>
                        {/* Parent Card */}
                        <button
                            onClick={onRequestParentView}
                            className="group relative w-72 p-8 rounded-[40px] bg-teal-50 border-4 border-white shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center justify-center overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-teal-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="w-24 h-24 mb-6 relative group-hover:scale-110 transition-transform duration-500">
                                <img src={quizBoard3d} alt="Parent" className="w-full h-full object-contain drop-shadow-lg" />
                            </div>
                            <h2 className="text-2xl font-black text-teal-800 relative z-10">家长控制台</h2>
                            <p className="text-sm font-bold text-teal-600/60 mt-2 relative z-10">Parent Dashboard</p>
                        </button>

                        {/* Children Cards */}
                        {familyChildren.map((child, index) => {
                            // Dynamic styles based on index to differentiate siblings
                            const styles = index % 2 === 0
                                ? { bg: 'bg-blue-50', text: 'text-blue-800', accent: 'bg-blue-200', sub: 'text-blue-600/60' }
                                : { bg: 'bg-orange-50', text: 'text-orange-800', accent: 'bg-orange-200', sub: 'text-orange-600/60' };

                            return (
                                <button
                                    key={child.id}
                                    onClick={() => onSelectChild(child)}
                                    className={`group relative w-72 p-8 rounded-[40px] ${styles.bg} border-4 border-white shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center justify-center overflow-hidden`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className={`w-28 h-28 mb-6 relative group-hover:scale-110 transition-transform duration-500`}>
                                        {/* Use 3D Avatar for child if valid, otherwise fallback */}
                                        <img src={avatarGirl3d} alt="Child" className="w-full h-full object-contain drop-shadow-lg" />
                                    </div>
                                    <h2 className={`text-2xl font-black ${styles.text} relative z-10`}>{child.name}的空间</h2>
                                    <p className={`text-sm font-bold ${styles.sub} mt-2 relative z-10`}>Child Space</p>
                                </button>
                            );
                        })}

                        {familyChildren.length === 0 && (
                            <div className="w-72 p-8 rounded-[40px] bg-gray-50 border-4 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                                <span className="text-4xl mb-2">👶</span>
                                <span className="font-bold">还没有添加孩子</span>
                                <span className="text-xs mt-2">请进入家长控制台添加</span>
                            </div>
                        )}
                    </>
                )}

                {/* Direct Child Login View */}
                {user.role === 'child' && (
                    <button
                        onClick={() => onSelectChild(user)}
                        className="group relative w-72 p-8 rounded-[40px] bg-indigo-50 border-4 border-white shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center justify-center overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-32 h-32 mb-6 group-hover:scale-110 transition-transform duration-500">
                            <img src={avatarGirl3d} alt="Start" className="w-full h-full object-contain drop-shadow-xl" />
                        </div>
                        <h2 className="text-2xl font-black text-indigo-800 relative z-10">开始探险</h2>
                        <p className="text-sm font-bold text-indigo-600/60 mt-2 relative z-10">Start Adventure</p>
                    </button>
                )}
            </div>

            <button
                onClick={onSignOut}
                className="mt-16 px-8 py-3 rounded-full bg-white text-gray-400 font-bold hover:bg-red-50 hover:text-red-500 hover:shadow-lg transition-all duration-300 flex items-center gap-2"
            >
                <span>退出登录</span>
            </button>
        </div>
    );
};

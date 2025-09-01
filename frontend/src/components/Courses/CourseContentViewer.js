import { useState } from 'react';
import {
    DocumentIcon,
    PlayIcon,
    LinkIcon,
    LockClosedIcon,
    EyeIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import ResourcePreviewModal from './ResourcePreviewModal';

const CourseContentViewer = ({
    materials,
    isEnrolled,
    canEdit,
    onEnroll,
    enrollmentLoading
}) => {
    const [previewMaterial, setPreviewMaterial] = useState(null);

    const getIconForType = (type) => {
        switch (type) {
            case 'video': return PlayIcon;
            case 'link': return LinkIcon;
            default: return DocumentIcon;
        }
    };

    const canAccessMaterial = (material) => {
        return isEnrolled || canEdit || material.isFree;
    };

    const freeMaterialsCount = materials.filter(m => m.isFree).length;
    const lockedMaterialsCount = materials.length - freeMaterialsCount;

    if (!materials || materials.length === 0) {
        return (
            <div className="card">
                <div className="text-center py-8">
                    <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Available</h3>
                    <p className="text-gray-600">
                        Verified resources (admin uploaded) will appear here once available.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Materials Overview */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Course Materials</h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            {freeMaterialsCount} Free
                        </span>
                        {lockedMaterialsCount > 0 && (
                            <span className="flex items-center">
                                <LockClosedIcon className="h-3 w-3 mr-2" />
                                {lockedMaterialsCount} Verified Only
                            </span>
                        )}
                    </div>
                </div>

                {/* Materials List */}
                <div className="space-y-3">
                    {materials.map((material, index) => {
                        const Icon = getIconForType(material.type);
                        const canAccess = canAccessMaterial(material);

                        return (
                            <div
                                key={material._id || index}
                                className={`relative p-4 border rounded-lg transition-all ${canAccess
                                        ? 'border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer'
                                        : 'border-gray-100 bg-gray-50'
                                    }`}
                                onClick={() => canAccess && setPreviewMaterial(material)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3 flex-1">
                                        <div className={`relative ${!canAccess ? 'opacity-50' : ''}`}>
                                            <Icon className="h-6 w-6 text-gray-500" />
                                            {!canAccess && (
                                                <LockClosedIcon className="h-3 w-3 text-red-500 absolute -top-1 -right-1 bg-white rounded-full" />
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h3 className={`font-medium ${canAccess ? 'text-gray-900' : 'text-gray-500'}`}>
                                                    {material.title}
                                                </h3>
                                                {material.isFree && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Free
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-sm capitalize ${canAccess ? 'text-gray-600' : 'text-gray-400'}`}>
                                                {material.type}
                                                {material.description && ` • ${material.description}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        {canAccess ? (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewMaterial(material);
                                                        }}
                                                        className="btn btn-secondary btn-sm flex items-center"
                                                    >
                                                        <EyeIcon className="h-4 w-4 mr-1" />
                                                        Preview
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(material.url, '_blank');
                                                        }}
                                                        className="btn btn-outline btn-sm"
                                                    >
                                                        Open
                                                    </button>
                                                </div>
                                                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                                            </>
                                        ) : (
                                            <div className="flex items-center text-gray-400">
                                                <LockClosedIcon className="h-4 w-4 mr-2" />
                                                <span className="text-sm">Locked</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Enrollment CTA */}
                {!isEnrolled && lockedMaterialsCount > 0 && (
                    <div className="mt-6 p-6 bg-gray-100 border border-gray-300 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-black">
                                    Unlock Verified Content
                                </h3>
                                <p className="text-gray-700 mt-1">
                                    Enroll now to access all {materials.length} course materials, including {lockedMaterialsCount} verified-only {lockedMaterialsCount === 1 ? 'resource' : 'resources'}.
                                </p>
                                <div className="mt-3 flex items-center space-x-4 text-sm">
                                    <span className="flex items-center text-green-600">
                                        ✓ All video lectures
                                    </span>
                                    <span className="flex items-center text-green-600">
                                        ✓ Study notes & documents
                                    </span>
                                    <span className="flex items-center text-green-600">
                                        ✓ Assignments & quizzes
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onEnroll}
                                disabled={enrollmentLoading}
                                className="btn btn-primary px-6 py-3 text-lg disabled:opacity-50"
                            >
                                {enrollmentLoading ? 'Enrolling...' : 'Enroll Now'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Unified Resource Preview Modal */}
            {previewMaterial && canAccessMaterial(previewMaterial) && (
                <ResourcePreviewModal resource={previewMaterial} onClose={() => setPreviewMaterial(null)} />
            )}
        </div>
    );
};

export default CourseContentViewer;
interface Props {
    courseTitle: string;
    participatingAcademicCourses: string;
    term: string;
}

export default function TeachingInformationContentItem({
    courseTitle,
    participatingAcademicCourses,
    term,
}: Props) {
    return (
        <li className={'py-2 mr-2'}>
            <div className={'font-semibold'}>{courseTitle}</div>
            <div>{participatingAcademicCourses}</div>
            <div className={'text-gray-600'}>{term}</div>
        </li>
    );
}

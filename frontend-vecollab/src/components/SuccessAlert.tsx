export default function SuccessAlert({ message }: { message: string }) {
    return (
        <div className="fixed bottom-0 right-0 min-w-[10rem] p-4 my-8 mx-8 flex justify-center bg-green-500 text-white rounded-2xl shadow-xl">
            {message}
        </div>
    );
}

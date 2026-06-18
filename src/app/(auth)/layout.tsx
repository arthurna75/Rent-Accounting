export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 bg-blue-600">
        <div className="text-white">
          <h1 className="text-4xl font-bold mb-4">임대사업자 복식회계</h1>
          <p className="text-blue-100 text-lg">
            임대사업자를 위한 전문 복식회계 솔루션으로
            <br />
            세무·회계 업무를 간편하게 관리하세요.
          </p>
          <ul className="mt-8 space-y-3 text-blue-100">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              복식부기 자동화
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              임대차 계약 관리
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              세금계산서 발행
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              재무제표 자동 생성
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-gray-50">
        <div className="mx-auto w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}

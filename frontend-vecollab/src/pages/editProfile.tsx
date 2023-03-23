import WhiteBox from "@/components/Layout/WhiteBox";
import VerticalTabs from "@/components/profile/VerticalTabs";

export default function EditProfile() {
    return (
        <div className={"flex justify-center"}>
            <WhiteBox>
                <div className={"w-[60rem] h-96"}> {/* remove fixed height once content is available */}
                    <VerticalTabs>
                        <div tabname="Stammdaten">
                            Empty
                        </div>
                        <div tabname="VE-Info">
                            auch Empty
                        </div>
                        <div tabname="Lehre & Forschung">
                            ebenfalls Empty
                        </div>
                        <div tabname="CV">
                            ofc Empty
                        </div>
                        <div tabname="VE-Schaufenster">
                            <div className={""}>
                                logo Empty
                            </div>
                        </div>
                    </VerticalTabs>
                </div>
            </WhiteBox>
        </div>
    )
}